import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import type { AnalysisResult } from "@/lib/voxguard";

type Props = { result: AnalysisResult };

/** Detection overview: verdict, confidence dial and class probabilities. */
export function DetectionResult({ result }: Props) {
  const fake = result.prediction === "fake";
  const confidence = result.confidence * 100;
  const color = fake ? "var(--verdict-fake)" : "var(--verdict-real)";
  const circumference = 2 * Math.PI * 50;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-8">
        <div className="min-w-0">
          <span className="eyebrow text-[10px]">Verdict</span>
          <h3 className="text-4xl font-semibold tracking-tight" style={{ color }}>
            {fake ? "AI GENERATED" : "AUTHENTIC"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {fake
              ? "Potential synthetic or manipulated speech detected."
              : "No indicators of synthetic speech in the model prediction."}
          </p>
        </div>

        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-secondary)" strokeWidth="9" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - confidence / 100)}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <strong className="mono-num block text-2xl font-semibold">{confidence.toFixed(1)}%</strong>
              <small className="eyebrow text-[9px]">Confidence</small>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ConfidenceMeter
          label="Real probability"
          value={result.probabilities.real}
          color="var(--verdict-real)"
        />
        <ConfidenceMeter
          label="AI probability"
          value={result.probabilities.fake}
          color="var(--verdict-fake)"
        />
      </div>
    </div>
  );
}
