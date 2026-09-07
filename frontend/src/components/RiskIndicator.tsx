import { riskColor, riskLabel, riskLevel } from "@/lib/voxguard";

type Props = {
  /** AI-voice probability, 0..1. */
  probability: number;
  /** Compact variant for inline/call use. */
  compact?: boolean;
  caption?: string;
};

/** Live AI-voice risk readout with configurable thresholds. */
export function RiskIndicator({ probability, compact = false, caption }: Props) {
  const level = riskLevel(probability);
  const color = riskColor(level);
  const pct = Math.min(100, Math.max(0, probability * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="eyebrow text-[10px]">AI voice probability</span>
          <strong
            className="mono-num block leading-none font-semibold"
            style={{ color, fontSize: compact ? "2rem" : "2.75rem" }}
          >
            {pct.toFixed(1)}%
          </strong>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em]"
          style={{ color, borderColor: color }}
        >
          {riskLabel(probability)}
        </span>
      </div>

      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: 20 }).map((_, index) => (
          <span
            key={index}
            className="h-2 flex-1 rounded-sm"
            style={{
              background: index < Math.round(pct / 5) ? color : "var(--color-secondary)",
            }}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {caption ?? "Detection confidence, not absolute proof of synthetic speech."}
      </p>
    </div>
  );
}
