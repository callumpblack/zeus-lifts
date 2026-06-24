"use client";

import { COLOR, progressColor } from "./progress";

export interface ChartPoint {
  label: string;
  value: number | null; // null = no data that day
}

// ── Calorie bar chart (weekly) ──────────────────────────────────────────────
interface BarsProps {
  data: ChartPoint[];
  target: number;
}

/** 7-ish vertical bars with a dashed target line, bars colour-coded vs target. */
export function CalorieBars({ data, target }: BarsProps) {
  const values = data.map((d) => d.value ?? 0);
  const max = Math.max(target, ...values, 1) * 1.1;
  const W = 320;
  const H = 150;
  const gap = 10;
  const n = data.length || 1;
  const barW = (W - gap * (n - 1)) / n;
  const targetY = H - (target / max) * H;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" height={H}>
        {/* target line */}
        {target > 0 && (
          <line
            x1={0}
            x2={W}
            y1={targetY}
            y2={targetY}
            stroke={COLOR.success}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.7}
          />
        )}
        {data.map((d, i) => {
          const v = d.value ?? 0;
          const h = v > 0 ? Math.max((v / max) * H, 2) : 0;
          const x = i * (barW + gap);
          return (
            <rect
              key={i}
              x={x}
              y={H - h}
              width={barW}
              height={h}
              rx={3}
              fill={d.value == null ? COLOR.track : progressColor(v, target)}
            />
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between">
        {data.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10px] text-faint"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Trend line chart (monthly calories / bodyweight) ────────────────────────
interface LineProps {
  data: ChartPoint[];
  color?: string;
  target?: number | null;
  /** Decimal places for the min/max axis labels. */
  precision?: number;
  unit?: string;
}

/** Auto-scaled line chart over a series; gaps (null) are bridged. */
export function TrendLine({
  data,
  color = COLOR.accent,
  target = null,
  precision = 0,
  unit = "",
}: LineProps) {
  const pts = data
    .map((d, i) => ({ i, v: d.value }))
    .filter((p): p is { i: number; v: number } => p.v != null);

  const W = 320;
  const H = 140;

  if (pts.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-faint">
        No data yet
      </div>
    );
  }

  const vals = pts.map((p) => p.v);
  const lo = Math.min(...vals, target ?? Infinity);
  const hi = Math.max(...vals, target ?? -Infinity);
  const span = hi - lo || 1;
  const padY = span * 0.12;
  const min = lo - padY;
  const max = hi + padY;
  const n = data.length;

  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - ((v - min) / (max - min)) * H;

  const d = pts
    .map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`)
    .join(" ");
  const area = `${d} L${x(pts[pts.length - 1].i).toFixed(1)} ${H} L${x(pts[0].i).toFixed(1)} ${H} Z`;

  const fmt = (v: number) => `${v.toFixed(precision)}${unit}`;

  return (
    <div>
      <div className="flex justify-between text-[10px] text-faint">
        <span>{fmt(hi)}</span>
        <span>{fmt(lo)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" height={H}>
        {target != null && target > 0 && (
          <line
            x1={0}
            x2={W}
            y1={y(target)}
            y2={y(target)}
            stroke={COLOR.success}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.6}
          />
        )}
        <path d={area} fill={color} opacity={0.12} />
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {pts.length === 1 && (
          <circle cx={x(pts[0].i)} cy={y(pts[0].v)} r={3} fill={color} />
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-faint">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
