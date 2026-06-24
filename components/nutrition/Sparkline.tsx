"use client";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Draw dots at each point. */
  dots?: boolean;
}

/**
 * Minimal SVG sparkline — no axes, no library. Auto-scales to the value range
 * with a little vertical padding so flat-ish series still read as a line.
 */
export default function Sparkline({
  values,
  width = 120,
  height = 36,
  color = "#10B981",
  dots = false,
}: Props) {
  if (values.length === 0) {
    return <div style={{ width, height }} />;
  }
  if (values.length === 1) {
    const cy = height / 2;
    return (
      <svg width={width} height={height}>
        <circle cx={width / 2} cy={cy} r={3} fill={color} />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const innerH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return { x, y };
  });

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {dots &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />
        ))}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={color} />
    </svg>
  );
}
