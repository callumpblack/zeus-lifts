"use client";

import { COLOR, fraction, progressColor } from "./progress";

interface Props {
  consumed: number;
  target: number;
  /** Outer diameter in px. */
  size?: number;
  stroke?: number;
  /** Override the auto colour-coding (e.g. fixed macro colours). */
  color?: string;
  /** Centre content; defaults to consumed/target readout. */
  children?: React.ReactNode;
  label?: string;
}

/** A single circular progress ring (SVG). Fill is clamped at 100% visually. */
export default function MacroRing({
  consumed,
  target,
  size = 72,
  stroke = 7,
  color,
  children,
  label,
}: Props) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(fraction(consumed, target), 1);
  const ringColor = color ?? progressColor(consumed, target);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={COLOR.track}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      </div>
      {label && (
        <span className="text-[11px] font-medium text-muted">{label}</span>
      )}
    </div>
  );
}
