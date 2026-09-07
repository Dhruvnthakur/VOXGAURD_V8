import { EmptyState } from "@/components/Panel";
import { overallRisk, riskColor, riskLabel, riskLevel, type AnalysisWindow } from "@/lib/voxguard";

type Props = { windows: AnalysisWindow[] };

/** Sequential analysis windows with AI probability per window. */
export function AnalysisTimeline({ windows }: Props) {
  if (windows.length === 0) {
    return (
      <EmptyState>
        No windowed analysis yet. Windows appear once the backend returns per-chunk results.
      </EmptyState>
    );
  }

  const overall = overallRisk(windows);

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-2" role="img" aria-label="AI probability per window">
        {windows.map((window) => {
          const pct = window.probabilities.fake * 100;
          const color = riskColor(riskLevel(window.probabilities.fake));
          return (
            <div key={window.index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="mono-num text-xs" style={{ color }}>
                {pct.toFixed(0)}%
              </span>
              <div className="flex h-28 w-full items-end rounded-md bg-secondary/60">
                <div className="w-full rounded-md" style={{ height: `${Math.max(3, pct)}%`, background: color }} />
              </div>
              <span className="mono-num truncate text-[10px] text-muted-foreground">
                {window.start}–{window.end}s
              </span>
            </div>
          );
        })}
      </div>

      {overall !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-4">
          <span className="eyebrow text-[10px]">Overall risk score</span>
          <div className="flex items-center gap-3">
            <strong className="mono-num text-xl" style={{ color: riskColor(riskLevel(overall)) }}>
              {(overall * 100).toFixed(1)}%
            </strong>
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em]"
              style={{ color: riskColor(riskLevel(overall)), borderColor: riskColor(riskLevel(overall)) }}
            >
              {riskLabel(overall)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
