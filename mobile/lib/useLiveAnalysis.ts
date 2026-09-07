import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import { analyzeChunk, saveSession, type LiveWindow } from "./voxguard";

const CHUNK_MS = 5000;
const IS_WEB = Platform.OS === "web";

export type CallPhase = "idle" | "active" | "ended";

type State = {
  phase: CallPhase;
  analyzing: boolean;
  elapsed: number;
  windows: LiveWindow[];
  level: number;
  error: string | null;
};

/**
 * Drives a VoxGuard audio session.
 *
 * On web  → MediaRecorder API (mirrors the web frontend exactly).
 * On native → expo-av Audio.Recording.
 *
 * All mutable session state lives in refs so state updates never
 * invalidate the recording loop or the elapsed-time timer.
 */
export function useLiveAnalysis() {
  const [state, setState] = useState<State>({
    phase: "idle",
    analyzing: true,
    elapsed: 0,
    windows: [],
    level: 0,
    error: null,
  });

  // ── shared refs (never cause re-renders) ──────────────────────────────
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef    = useRef(0);
  const analyzingRef = useRef(true);
  const startedRef  = useRef(0);
  const activeRef   = useRef(false);

  // ── web-specific refs ─────────────────────────────────────────────────
  const streamRef   = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // ── native-specific refs ──────────────────────────────────────────────
  const nativeRecRef = useRef<Audio.Recording | null>(null);

  /* ────────────────────────── recording loop ────────────────────────── */

  const recordWindow = useCallback(async () => {
    if (!analyzingRef.current || !activeRef.current) return;

    const windowStart = (Date.now() - startedRef.current) / 1000;
    const index = indexRef.current++;

    if (IS_WEB) {
      /* ── WEB path: MediaRecorder ── */
      const stream = streamRef.current;
      if (!stream) return;

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        setState((s) => ({ ...s, error: "Audio recording is not supported in this browser." }));
        return;
      }

      recorderRef.current = recorder;
      const parts: Blob[] = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) parts.push(e.data); };

      recorder.onstop = async () => {
        // Schedule next window BEFORE the async network call
        if (analyzingRef.current && activeRef.current) {
          // Use a tiny delay to avoid a call-stack explosion on fast backends
          setTimeout(() => recordWindow(), 0);
        }

        const blob = new Blob(parts, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1024) return;

        try {
          const blobUrl = URL.createObjectURL(blob);
          const result = await analyzeChunk(blobUrl, `window-${index}.webm`);
          URL.revokeObjectURL(blobUrl);

          const entry: LiveWindow = {
            index,
            start: windowStart,
            end: windowStart + CHUNK_MS / 1000,
            aiProbability: result.probabilities.fake,
            result,
          };

          setState((s) => {
            const windows = [...s.windows, entry].sort((a, b) => a.index - b.index);
            // fire-and-forget; do NOT await inside setState
            void saveSession({ startedAt: startedRef.current, windows });
            return { ...s, windows, error: null };
          });
        } catch (err) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : "Analysis failed.",
          }));
        }
      };

      recorder.start();
      // Stop the recorder after CHUNK_MS; onstop fires and schedules the next window
      cycleRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, CHUNK_MS);

    } else {
      /* ── NATIVE path: expo-av ── */
      let recording: Audio.Recording;
      try {
        const { recording: rec } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recording = rec;
        nativeRecRef.current = rec;
      } catch {
        setState((s) => ({
          ...s,
          error: "Microphone recording is not supported on this device.",
        }));
        return;
      }

      cycleRef.current = setTimeout(async () => {
        if (nativeRecRef.current !== recording) return; // superseded
        nativeRecRef.current = null;

        try {
          await recording.stopAndUnloadAsync();
        } catch { /* ignore */ }

        const uri = recording.getURI();

        // Schedule next window before the network call
        if (analyzingRef.current && activeRef.current) {
          setTimeout(() => recordWindow(), 0);
        }

        if (!uri) return;

        try {
          const result = await analyzeChunk(uri, `window-${index}.m4a`);
          const entry: LiveWindow = {
            index,
            start: windowStart,
            end: windowStart + CHUNK_MS / 1000,
            aiProbability: result.probabilities.fake,
            result,
          };
          setState((s) => {
            const windows = [...s.windows, entry].sort((a, b) => a.index - b.index);
            void saveSession({ startedAt: startedRef.current, windows });
            return { ...s, windows, error: null };
          });
        } catch (err) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : "Analysis failed.",
          }));
        }
      }, CHUNK_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable: only uses refs and module-level constants

  /* ─────────────────────────── stop helpers ─────────────────────────── */

  const stopRecording = useCallback(async () => {
    if (cycleRef.current) {
      clearTimeout(cycleRef.current);
      cycleRef.current = null;
    }
    if (IS_WEB) {
      const rec = recorderRef.current;
      recorderRef.current = null;
      if (rec && rec.state !== "inactive") rec.stop();
    } else {
      const rec = nativeRecRef.current;
      nativeRecRef.current = null;
      if (rec) {
        try {
          const s = await rec.getStatusAsync();
          if (s.isRecording) await rec.stopAndUnloadAsync();
        } catch { /* already stopped */ }
      }
    }
  }, []); // stable

  /* ────────────────────── public API ──────────────────────────────────── */

  const startCall = useCallback(async () => {
    try {
      if (IS_WEB) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } else {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          setState((s) => ({
            ...s,
            error: "Microphone access is required to run VoxGuard call protection.",
          }));
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      startedRef.current = Date.now();
      indexRef.current = 0;
      analyzingRef.current = true;
      activeRef.current = true;

      setState({
        phase: "active",
        analyzing: true,
        elapsed: 0,
        windows: [],
        level: 0,
        error: null,
      });

      // Timer: updates elapsed every 500 ms
      timerRef.current = setInterval(() => {
        setState((s) => ({
          ...s,
          elapsed: (Date.now() - startedRef.current) / 1000,
        }));
      }, 500);

      recordWindow();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof Error
            ? err.message
            : "Microphone access is required to run VoxGuard call protection.",
      }));
    }
  }, [recordWindow]); // recordWindow is stable (empty deps)

  const pauseAnalysis = useCallback(async () => {
    analyzingRef.current = false;
    await stopRecording();
    setState((s) => ({ ...s, analyzing: false }));
  }, [stopRecording]);

  const resumeAnalysis = useCallback(() => {
    analyzingRef.current = true;
    setState((s) => ({ ...s, analyzing: true }));
    recordWindow();
  }, [recordWindow]);

  const endCall = useCallback(async () => {
    analyzingRef.current = false;
    activeRef.current = false;

    await stopRecording();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (IS_WEB) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    } else {
      try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); }
      catch { /* ignore */ }
    }

    setState((s) => ({ ...s, phase: "ended", analyzing: false, level: 0 }));
  }, [stopRecording]);

  // Cleanup on unmount only — stable deps, runs exactly once
  useEffect(() => {
    return () => {
      analyzingRef.current = false;
      activeRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (cycleRef.current) clearTimeout(cycleRef.current);
      if (IS_WEB) {
        const rec = recorderRef.current;
        if (rec && rec.state !== "inactive") rec.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } else {
        nativeRecRef.current?.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []); // empty deps = true mount/unmount only

  return { ...state, startCall, pauseAnalysis, resumeAnalysis, endCall };
}
