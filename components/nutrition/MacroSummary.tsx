"use client";

import type { MacroTargets } from "@/lib/nutrition/types";
import type { MacroTotals } from "@/lib/nutrition/db";
import MacroRing from "./MacroRing";
import { progressColor, remaining } from "./progress";

interface Props {
  consumed: MacroTotals;
  targets: MacroTargets;
}

/**
 * Top-of-dashboard macro summary: a big calories ring plus protein / fat /
 * carbs rings. Calories are colour-coded by adherence; the macro rings use
 * fixed hues so they're recognisable at a glance.
 */
export default function MacroSummary({ consumed, targets }: Props) {
  const kcal = Math.round(consumed.calories);
  const left = remaining(consumed.calories, targets.calories);
  const over = kcal > targets.calories;

  return (
    <div className="rounded-2xl bg-card p-5">
      <div className="flex items-center justify-center">
        <MacroRing
          consumed={consumed.calories}
          target={targets.calories}
          size={150}
          stroke={12}
          color={progressColor(consumed.calories, targets.calories)}
        >
          <span className="text-3xl font-extrabold tabular-nums text-white">
            {kcal}
          </span>
          <span className="text-[11px] font-medium text-muted">
            / {targets.calories} kcal
          </span>
          <span
            className={`mt-0.5 text-[11px] font-semibold ${
              over ? "text-danger" : "text-accent"
            }`}
          >
            {over ? `${kcal - targets.calories} over` : `${left} left`}
          </span>
        </MacroRing>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MacroBar
          label="Protein"
          consumed={consumed.protein_g}
          target={targets.protein_g}
          color="#38BDF8"
        />
        <MacroBar
          label="Fat"
          consumed={consumed.fat_g}
          target={targets.fat_g}
          color="#FBBF24"
        />
        <MacroBar
          label="Carbs"
          consumed={consumed.carbs_g}
          target={targets.carbs_g}
          color="#A78BFA"
        />
      </div>
    </div>
  );
}

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const g = Math.round(consumed);
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  return (
    <div className="rounded-xl bg-elevated p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-[11px] text-faint">{target}g</span>
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-white">
        {g}
        <span className="text-xs font-medium text-muted">g</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
