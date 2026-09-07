/**
 * VoxGuard shared domain layer.
 *
 * All HTTP communication with the FastAPI backend lives here — components and
 * routes must never call `fetch` directly.
 */

export const API_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/* ------------------------------------------------------------------ types */

export type Prediction = "real" | "fake";

export type F0Data = {
  time: number[];
  frequency: (number | null)[];
  mean: number;
  min: number;
  max: number;
  std: number;
  /** Percentage of frames with detected voicing, when the backend reports it. */
  voiced_percent?: number;
};

export type MfccData = {
  /** [coefficient][frame] */
  data: number[][];
  coefficients: number;
};

export type MelData = {
  /** [mel band][frame], dB scale */
  data: number[][];
  mel_bands: number;
};

export type AudioMeta = {
  duration: number;
  sample_rate: number;
};

/** One rolling analysis window (live call or long-file segmentation). */
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
  /** Everything below is optional — the backend may not expose it yet. */
  audio?: AudioMeta;
  f0?: F0Data;
  mfcc?: MfccData;
  mel_spectrogram?: MelData;
  windows?: AnalysisWindow[];
};

/* -------------------------------------------------------------- risk model */

export type RiskLevel = "low" | "medium" | "high" | "critical";

/** Single source of truth for risk thresholds (AI probability, 0-1). */
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

/** CSS variable used to colour a given risk level. */
export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "var(--risk-low)";
    case "medium":
      return "var(--risk-medium)";
    case "high":
      return "var(--risk-high)";
    case "critical":
      return "var(--risk-critical)";
  }
}

/** Overall risk across windows: emphasises the sustained signal, not one spike. */
export function overallRisk(windows: AnalysisWindow[]): number | null {
  if (windows.length === 0) return null;
  const values = windows.map((w) => w.probabilities.fake);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const peak = Math.max(...values);
  return mean * 0.7 + peak * 0.3;
}

/* ----------------------------------------------------------------- format */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

async function postAudio(path: string, file: Blob, filename: string): Promise<AnalysisResult> {
  const body = new FormData();
  body.append("file", file, filename);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method: "POST", body });
  } catch {
    throw new Error(`Cannot reach the analysis backend at ${API_URL}.`);
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

/** Analyze a complete recording. */
export function analyzeAudio(file: File): Promise<AnalysisResult> {
  return postAudio("/api/analyze", file, file.name);
}

/**
 * Analyze a single short chunk of a live VoxGuard call.
 * Requires the future `POST /api/analyze-chunk` endpoint; no client-side faking.
 */
export function analyzeChunk(chunk: Blob, filename = "chunk.wav"): Promise<AnalysisResult> {
  return postAudio("/api/analyze-chunk", chunk, filename);
}

/* ---------------------------------------------------------------- storage */

const RESULT_KEY = "voxguard:result";
let audioHandle: File | null = null;

export function saveResult(result: AnalysisResult): void {
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    /* storage unavailable — in-memory navigation still works */
  }
}

export function loadResult(): AnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as AnalysisResult) : null;
  } catch {
    return null;
  }
}

export function clearResult(): void {
  try {
    sessionStorage.removeItem(RESULT_KEY);
  } catch {
    /* ignore */
  }
  audioHandle = null;
}

/** The analyzed file is kept in memory only — never persisted. */
export async function saveAudio(file: File): Promise<void> {
  audioHandle = file;
}

export async function getAudio(): Promise<File | null> {
  return audioHandle;
}
