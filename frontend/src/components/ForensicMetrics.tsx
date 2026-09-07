import { Metric } from "@/components/Panel";
import type { AnalysisResult } from "@/lib/voxguard";

type Props = { result: AnalysisResult };

/** Forensic metric grid. Every unavailable backend field renders as "—". */
export function ForensicMetrics({ result }: Props) {
  const { audio, f0, mfcc, mel_spectrogram: mel } = result;
  const pitchRange = f0 ? f0.max - f0.min : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Duration" value={audio ? `${audio.duration.toFixed(2)} s` : "—"} />
      <Metric label="Sample rate" value={audio ? `${(audio.sample_rate / 1000).toFixed(1)} kHz` : "—"} />
      <Metric label="MFCC coefficients" value={mfcc ? String(mfcc.coefficients) : "—"} />
      <Metric label="Mel bands" value={mel ? String(mel.mel_bands) : "—"} />
      <Metric label="Mean F0" value={f0 ? `${Math.round(f0.mean)} Hz` : "—"} />
      <Metric label="Pitch range" value={pitchRange !== null ? `${Math.round(pitchRange)} Hz` : "—"} />
      <Metric
        label="Voiced frames"
        value={typeof f0?.voiced_percent === "number" ? `${f0.voiced_percent.toFixed(1)}%` : "—"}
      />
      <Metric label="Detection confidence" value={`${(result.confidence * 100).toFixed(1)}%`} />
    </div>
  );
}
