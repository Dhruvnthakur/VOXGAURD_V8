/**
 * VoxGuard mobile domain layer — React Native port.
 *
 * All HTTP communication with the FastAPI backend lives here.
 * Works on both native (expo-av file URIs) and web (blob URLs / localStorage).
 */

import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
const API_KEY = "voxguard:apiUrl";
export const DEFAULT_API_URL = "http://localhost:8000";

/* ─────────────────────────────────── storage helpers ─────────────────── */

// On web, AsyncStorage may not work — fall back to localStorage.
async function storageGet(key: string): Promise<string | null> {
  if (isWeb) {
    try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; }
    catch { return null; }
  }
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    return AsyncStorage.getItem(key);
  } catch { return null; }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); }
    catch { /* ignore */ }
    return;
  }
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    await AsyncStorage.setItem(key, value);
  } catch { /* ignore */ }
}

export async function getApiUrl(): Promise<string> {
  try {
    const stored = await storageGet(API_KEY);
    return stored?.trim() || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export async function setApiUrl(url: string): Promise<void> {
  try {
    await storageSet(API_KEY, url.trim().replace(/\/+$/, ""));
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ types */

export type Prediction = "real" | "fake";

export type F0Data = {
  time: number[];
  frequency: (number | null)[];
  mean: number;
  min: number;
  max: number;
  std: number;
  voiced_percent?: number;
};

export type MfccData = { data: number[][]; coefficients: number };
export type MelData = { data: number[][]; mel_bands: number };
export type AudioMeta = { duration: number; sample_rate: number };

export type AnalysisWindow = {
  index: number;
  start: number;
  end: number;
  prediction: Prediction;
  confidence: number;
  probabilities: { real: number; fake: number };
};

export type AnalysisResult = {
  success: boolean;
  error?: string;
  filename: string;
  prediction: Prediction;
  confidence: number;
  probabilities: { real: number; fake: number };
  audio?: AudioMeta;
  f0?: F0Data;
  mfcc?: MfccData;
  mel_spectrogram?: MelData;
  windows?: AnalysisWindow[];
};

/** One completed 5s live window. */
export type LiveWindow = {
  index: number;
  start: number;
  end: number;
  aiProbability: number;
  result: AnalysisResult;
};

/* -------------------------------------------------------------- risk model */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const RISK_THRESHOLDS: { level: RiskLevel; min: number; label: string }[] = [
  { level: "low", min: 0, label: "LOW RISK" },
  { level: "medium", min: 0.3, label: "MEDIUM RISK" },
  { level: "high", min: 0.6, label: "HIGH RISK" },
  { level: "critical", min: 0.85, label: "AI VOICE SUSPECTED" },
];

export function riskLevel(aiProbability: number): RiskLevel {
  let level: RiskLevel = "low";
  for (const entry of RISK_THRESHOLDS) if (aiProbability >= entry.min) level = entry.level;
  return level;
}

export function riskLabel(aiProbability: number): string {
  const level = riskLevel(aiProbability);
  return RISK_THRESHOLDS.find((entry) => entry.level === level)?.label ?? "LOW RISK";
}

/** Returns a hex color string matching the web app's oklch values. */
export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "#4a7c5a";     // risk-low  ~oklch(0.5 0.09 150)
    case "medium":
      return "#b5830a";     // risk-medium ~oklch(0.6 0.13 90)
    case "high":
      return "#c7581a";     // risk-high  ~oklch(0.56 0.18 45)
    case "critical":
      return "#c23020";     // risk-critical ~oklch(0.52 0.21 22)
  }
}

/** Overall risk: emphasises the sustained signal, not one spike. */
export function overallRisk(values: number[]): number | null {
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const peak = Math.max(...values);
  return mean * 0.7 + peak * 0.3;
}

/* ----------------------------------------------------------------- format */

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/* -------------------------------------------------------------------- api */

async function postAudio(
  path: string,
  uri: string,
  filename: string,
  mimeType = "audio/webm"
): Promise<AnalysisResult> {
  const base = await getApiUrl();
  const body = new FormData();

  if (isWeb) {
    // Web: uri is a blob: URL — fetch it and append as a Blob
    const blobRes = await fetch(uri);
    const blob = await blobRes.blob();
    body.append("file", blob, filename);
  } else {
    // Native: uri is a file:// path — React Native FormData accepts { uri, type, name }
    body.append("file", { uri, type: mimeType, name: filename } as any);
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { method: "POST", body });
  } catch {
    throw new Error(
      `Cannot reach the analysis backend at ${base}. Make sure uvicorn is running and CORS is enabled.`
    );
  }

  let payload: Partial<AnalysisResult> | null = null;
  try {
    payload = (await response.json()) as Partial<AnalysisResult>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    throw new Error(payload?.error || `Analysis failed (HTTP ${response.status}).`);
  }
  if (typeof payload.confidence !== "number" || !payload.probabilities || !payload.prediction) {
    throw new Error("The backend response is missing detection fields.");
  }

  return { ...(payload as AnalysisResult), success: true, filename: payload.filename ?? filename };
}

/** Analyze a single short chunk of a live VoxGuard call. */
export function analyzeChunk(uri: string, filename = "chunk.webm"): Promise<AnalysisResult> {
  return postAudio("/api/analyze-chunk", uri, filename);
}

/**
 * Analyze a complete recording file uploaded by the user.
 * Sends to /api/analyze which returns full forensic data — F0, MFCC,
 * mel-spectrogram, spectral metrics and confidence.
 */
export async function analyzeFullFile(
  uri: string,
  filename: string,
  mimeType?: string
): Promise<AnalysisResult> {
  const ext = filename.split(".").pop()?.toLowerCase();
  const inferredMime =
    mimeType ??
    (ext === "wav"  ? "audio/wav"  :
     ext === "m4a"  ? "audio/m4a"  :
     ext === "mp3"  ? "audio/mpeg" :
     ext === "flac" ? "audio/flac" :
     ext === "ogg"  ? "audio/ogg"  :
     "audio/webm");
  return postAudio("/api/analyze", uri, filename, inferredMime);
}

/* ---------------------------------------------------------------- storage */

const SESSION_KEY = "voxguard:session";

export type StoredSession = {
  startedAt: number;
  windows: LiveWindow[];
};

export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await storageSet(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await storageGet(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}
