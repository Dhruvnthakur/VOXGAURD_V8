import type { ReactNode } from "react";

type PanelProps = {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Shared bordered section used across the forensic dashboard. */
export function Panel({ eyebrow, title, action, children, className = "" }: PanelProps) {
  return (
    <section className={`panel space-y-5 p-5 sm:p-6 ${className}`}>
      {eyebrow || title || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <span className="eyebrow text-primary">{eyebrow}</span> : null}
            {title ? <h2 className="mt-1 truncate text-lg font-semibold">{title}</h2> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Compact label/value tile for forensic metrics. */
export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <span className="eyebrow text-[10px]">{label}</span>
      <strong className="mono-num mt-1 block text-lg font-semibold">{value}</strong>
      {hint ? <small className="text-xs text-muted-foreground">{hint}</small> : null}
    </div>
  );
}

/** Consistent empty state for sections the backend has not populated yet. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
