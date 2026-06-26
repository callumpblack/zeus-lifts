"use client";

// Training-day calorie cycling. When a profile opts in, the daily calorie
// target auto-adjusts from that day's *lifting load* (read straight from the
// lifting tracker) rather than any manual marking:
//   • Rest day (no completed workout)      → target − 175 kcal
//   • Training day (one normal session)    → target unchanged
//   • Heavy / double day (high load)       → target + 300…500 kcal
//
// Protein and fat stay fixed; the adjustment is applied to calories and
// absorbed by carbs (the doc's "reduce/increase carbs only" rule).

import { getWorkouts } from "@/lib/db";
import { workoutVolume } from "@/lib/format";
import { toISODate } from "./dates";
import type { MacroTargets } from "./types";

export type ActivityTier = "rest" | "training" | "high";

export interface DayActivity {
  tier: ActivityTier;
  sessions: number;
  volumeKg: number;
  /** kcal added to (negative = removed from) the base calorie target. */
  calorieAdjustment: number;
  label: string;
}

const REST_ADJUSTMENT = -175;
const HIGH_MIN = 300;
const HIGH_MAX = 500;
// A single session counts as "high" once its volume reaches this multiple of
// the user's average session.
const HIGH_VOLUME_RATIO = 1.5;

const sameDay = (startedAt: string, date: string) =>
  toISODate(new Date(startedAt)) === date;

/**
 * Classify a given day from the user's completed workouts and return the
 * calorie adjustment. "Load" is total lifted volume (kg); the threshold for a
 * heavy day is relative to the user's own average session, so it adapts per
 * person. Bodyweight-only sessions (volume 0) still count as a training day.
 */
export async function getDayActivity(date: string): Promise<DayActivity> {
  const completed = (await getWorkouts()).filter((w) => w.finishedAt);
  const today = completed.filter((w) => sameDay(w.startedAt, date));
  const sessions = today.length;
  const volumeKg = today.reduce((sum, w) => sum + workoutVolume(w), 0);

  if (sessions === 0) {
    return {
      tier: "rest",
      sessions,
      volumeKg,
      calorieAdjustment: REST_ADJUSTMENT,
      label: "Rest day",
    };
  }

  // Reference volume = average of the user's other weighted sessions.
  const others = completed.filter(
    (w) => !sameDay(w.startedAt, date) && workoutVolume(w) > 0
  );
  const avg = others.length
    ? others.reduce((sum, w) => sum + workoutVolume(w), 0) / others.length
    : 0;
  const ratio = avg > 0 ? volumeKg / avg : 1;

  const isHigh = sessions >= 2 || ratio >= HIGH_VOLUME_RATIO;
  if (isHigh) {
    // Scale within the 300–500 band by how far above average the load is.
    const scaled = Math.round((ratio - 1) * 600);
    const calorieAdjustment = Math.min(Math.max(scaled, HIGH_MIN), HIGH_MAX);
    return {
      tier: "high",
      sessions,
      volumeKg,
      calorieAdjustment,
      label: sessions >= 2 ? "Double day" : "Heavy day",
    };
  }

  return {
    tier: "training",
    sessions,
    volumeKg,
    calorieAdjustment: 0,
    label: "Training day",
  };
}

/** Apply a day's adjustment to the base targets — carbs absorb the change. */
export function applyCycle(
  base: MacroTargets,
  activity: DayActivity
): MacroTargets {
  return {
    ...base,
    calories: Math.max(base.calories + activity.calorieAdjustment, 0),
    carbs_g: Math.max(
      base.carbs_g + Math.round(activity.calorieAdjustment / 4),
      0
    ),
  };
}
