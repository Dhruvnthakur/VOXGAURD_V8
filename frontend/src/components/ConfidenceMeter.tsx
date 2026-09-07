type Props = {
  label: string;
  /** 0..1 */
  value: number;
  color: string;
};

/** Horizontal probability bar. Colour comes from a semantic CSS token. */
export function ConfidenceMeter({ label, value, color }: Props) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="eyebrow text-[10px]">{label}</span>
        <strong className="mono-num text-sm text-foreground">{pct.toFixed(1)}%</strong>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-label={label}
        aria-valuenow={Number(pct.toFixed(1))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
