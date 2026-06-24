// Shared progress helpers for macro rings / bars.

export const COLOR = {
  accent: "#10B981", // under target — the brand emerald
  success: "#22C55E", // on target (90–105%)
  danger: "#FF453A", // over target
  track: "#1E2632", // elevated — the unfilled ring/bar track
} as const;

/** Fraction 0..1 of target consumed (0 when there's no target). */
export function fraction(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return consumed / target;
}

/** Colour-code progress: under → accent, on-target → green, over → red. */
export function progressColor(consumed: number, target: number): string {
  const pct = fraction(consumed, target) * 100;
  if (pct > 105) return COLOR.danger;
  if (pct >= 90) return COLOR.success;
  return COLOR.accent;
}

/** Whole number, never negative — for "remaining" readouts. */
export function remaining(consumed: number, target: number): number {
  return Math.max(Math.round(target - consumed), 0);
}
