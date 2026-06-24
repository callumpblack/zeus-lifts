// Derived stats for the history / trends views. Pure functions over the raw
// food and body-weight logs.

import type { BodyWeightLog, FoodLog } from "./types";
import { sumMacros } from "./db";
import { addDays } from "./dates";

export interface DayMacros {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

/** Group logs by day and sum each day's macros (only days that have logs). */
export function macrosByDay(logs: FoodLog[]): Map<string, DayMacros> {
  const byDay = new Map<string, FoodLog[]>();
  for (const f of logs) {
    const arr = byDay.get(f.loggedAt) ?? [];
    arr.push(f);
    byDay.set(f.loggedAt, arr);
  }
  const out = new Map<string, DayMacros>();
  for (const [day, arr] of byDay) {
    const m = sumMacros(arr);
    out.set(day, {
      calories: Math.round(m.calories),
      protein_g: Math.round(m.protein_g),
      fat_g: Math.round(m.fat_g),
      carbs_g: Math.round(m.carbs_g),
    });
  }
  return out;
}

/** Sorted set of days that have at least one logged food. */
export function loggedDays(logs: FoodLog[]): string[] {
  return [...new Set(logs.map((f) => f.loggedAt))].sort();
}

/** Longest run of consecutive calendar days present in the set. */
export function longestStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === addDays(sorted[i - 1], 1)) {
      run += 1;
      best = Math.max(best, run);
    } else if (sorted[i] !== sorted[i - 1]) {
      run = 1;
    }
  }
  return best;
}

/** Mean of a list (0 when empty). */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Adherence: share of logged days whose calories land within `tolerance`
 * (default ±10%) of the target. Returns 0..100.
 */
export function adherenceScore(
  byDay: Map<string, DayMacros>,
  target: number,
  tolerance = 0.1
): number {
  const days = [...byDay.values()];
  if (days.length === 0 || target <= 0) return 0;
  const band = target * tolerance;
  const hit = days.filter((d) => Math.abs(d.calories - target) <= band).length;
  return Math.round((hit / days.length) * 100);
}

/** Average of a single macro across logged days. */
export function averageMacro(
  byDay: Map<string, DayMacros>,
  key: keyof DayMacros
): number {
  return Math.round(mean([...byDay.values()].map((d) => d[key])));
}

/** Latest body-weight reading on or before each ISO date in `days`. */
export function weightSeries(
  logs: BodyWeightLog[],
  days: string[]
): (number | null)[] {
  const sorted = [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  return days.map((day) => {
    let val: number | null = null;
    for (const l of sorted) {
      if (l.loggedAt <= day) val = l.weightKg;
      else break;
    }
    return val;
  });
}
