import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnalysisTimeline } from "@/components/AnalysisTimeline";
import { AudioPlayer } from "@/components/AudioPlayer";
import { DetectionResult } from "@/components/DetectionResult";
import { F0Chart } from "@/components/F0Chart";
import { ForensicMetrics } from "@/components/ForensicMetrics";
import { MFCCHeatmap } from "@/components/MFCCHeatmap";
import { MelSpectrogram } from "@/components/MelSpectrogram";
import { EmptyState, Metric, Panel } from "@/components/Panel";
import { RiskIndicator } from "@/components/RiskIndicator";
import { Spectrum } from "@/components/Spectrum";
import { getAudio, loadResult, type AnalysisResult } from "@/lib/voxguard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Forensic Dashboard — VoxGuard Voice Analysis" },
      {
        name: "description",
        content:
          "Review the deepfake verdict, detection confidence, pitch contour, MFCC heatmap and Mel spectrogram of your analyzed recording.",
      },
      { property: "og:title", content: "Forensic Dashboard — VoxGuard" },
      {
        property: "og:description",
        content:
          "Verdict, confidence, spectrum, F0 contour, MFCC and Mel heatmaps for the analyzed audio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ready, setReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setResult(loadResult());
    void getAudio().then((audio) => setFile(audio ?? null));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!file || !audioRef.current) return;
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-5 py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-secondary" />
        <div className="h-64 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <span className="eyebrow text-primary">No analysis loaded</span>
        <h1 className="mt-3 text-2xl font-semibold">Nothing to inspect yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a recording to generate a forensic report. Results are not fabricated — everything
          shown here comes from the analysis backend.
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/" })}
          className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Upload audio
        </button>
      </div>
    );
  }

  const f0 = result.f0;
  const mfcc = result.mfcc;
  const mel = result.mel_spectrogram;
  const windows = result.windows ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow text-primary">Voice forensics</span>
          <h1 className="mt-2 truncate text-2xl font-semibold sm:text-3xl">{result.filename}</h1>
        </div>
        <Link
          to="/"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          New analysis
        </Link>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel eyebrow="Detection overview" title="Model verdict">
          <DetectionResult result={result} />
        </Panel>

        <div className="space-y-6">
          <Panel eyebrow="Risk" title="AI voice risk">
            <RiskIndicator probability={result.probabilities.fake} />
          </Panel>
          <Panel eyebrow="Audio" title="Playback">
            <AudioPlayer audioRef={audioRef} filename={result.filename} />
            <audio ref={audioRef} className="hidden" preload="metadata" />
            {!file ? (
              <p className="text-xs text-muted-foreground">
                The source file is unavailable in this session — re-upload to enable playback.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Duration" value={result.audio ? `${result.audio.duration.toFixed(2)} s` : "—"} />
              <Metric
                label="Sample rate"
                value={result.audio ? `${(result.audio.sample_rate / 1000).toFixed(1)} kHz` : "—"}
              />
            </div>
          </Panel>
        </div>
      </section>

      <Panel eyebrow="Frequency spectrum" title="Spectrum & waveform">
        {file ? (
          <Spectrum audioRef={audioRef} file={file} />
        ) : (
          <EmptyState>Spectrum needs the source audio. Re-upload the recording to view it.</EmptyState>
        )}
      </Panel>

      <Panel eyebrow="F0 / pitch analysis" title="Fundamental frequency contour">
        {f0 ? (
          <>
            <F0Chart f0={f0} />
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <Metric label="Mean F0" value={`${f0.mean.toFixed(1)} Hz`} />
              <Metric label="Min F0" value={`${f0.min.toFixed(1)} Hz`} />
              <Metric label="Max F0" value={`${f0.max.toFixed(1)} Hz`} />
              <Metric label="Pitch range" value={`${(f0.max - f0.min).toFixed(1)} Hz`} />
              <Metric label="Std deviation" value={`${f0.std.toFixed(1)} Hz`} />
              <Metric
                label="Voiced"
                value={typeof f0.voiced_percent === "number" ? `${f0.voiced_percent.toFixed(1)}%` : "—"}
              />
            </div>
          </>
        ) : (
          <EmptyState>The backend did not return pitch data for this recording.</EmptyState>
        )}
      </Panel>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel eyebrow="MFCC" title="Cepstral coefficients over time">
          {mfcc ? <MFCCHeatmap mfcc={mfcc} /> : <EmptyState>No MFCC data in this analysis.</EmptyState>}
        </Panel>
        <Panel eyebrow="Mel spectrogram" title="Mel band energy (dB)">
          {mel ? <MelSpectrogram mel={mel} /> : <EmptyState>No Mel spectrogram data in this analysis.</EmptyState>}
        </Panel>
      </section>

      <Panel eyebrow="Forensic metrics" title="Measured values">
        <ForensicMetrics result={result} />
      </Panel>

      <Panel eyebrow="Analysis timeline" title="Windowed AI probability">
        <AnalysisTimeline windows={windows} />
      </Panel>

      <Panel eyebrow="Forensic summary" title="Interpretation">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <strong className="text-sm">Detection signal</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              The classifier reports{" "}
              <strong style={{ color: result.prediction === "fake" ? "var(--verdict-fake)" : "var(--verdict-real)" }}>
                {result.prediction === "fake" ? "AI generated" : "authentic"}
              </strong>{" "}
              at {(result.confidence * 100).toFixed(1)}% confidence. This is the primary signal.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <strong className="text-sm">Pitch evidence</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              {f0
                ? `Mean ${Math.round(f0.mean)} Hz across a ${Math.round(f0.max - f0.min)} Hz range with ${f0.std.toFixed(1)} Hz variation.`
                : "Pitch features unavailable — treated as no evidence either way."}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <strong className="text-sm">Spectral evidence</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              {mel
                ? `${mel.mel_bands} Mel bands across ${mel.data[0]?.length ?? 0} frames available for review.`
                : "Spectral features unavailable — treated as no evidence either way."}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Acoustic features are supporting evidence only. A single unusual F0, MFCC or Mel value does
          not by itself indicate synthetic speech.
        </p>
      </Panel>
    </div>
  );
}
