import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { F0Data } from "@/lib/voxguard";

type Props = { f0: F0Data };

/** Pitch (F0) contour rendered as an SVG line chart. Unvoiced frames are gaps. */
export function F0Chart({ f0 }: Props) {
  const data = useMemo(() => {
    const points = f0.time.map((t, i) => ({
      time: t,
      hz: f0.frequency[i] ?? null,
    }));
    // Keep the chart light for long recordings.
    const stride = Math.max(1, Math.ceil(points.length / 900));
    return points.filter((_, i) => i % stride === 0);
  }, [f0]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => `${v.toFixed(1)}s`}
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => `${Math.round(v)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--color-popover-foreground)",
            }}
            labelFormatter={(v) => `${Number(v).toFixed(2)} s`}
            formatter={(v) => [typeof v === "number" ? `${v.toFixed(1)} Hz` : "unvoiced", "F0"]}
          />
          <Line
            type="monotone"
            dataKey="hz"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
