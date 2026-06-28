import type { Workout, WorkoutExercise } from "./types";
import { findExercise } from "./exercises";

/**
 * High-level training groups for charts. The exercise library tags a granular
 * `primaryMuscle` (e.g. "Lats", "Quadriceps"); here we roll those up into the
 * handful of groups people actually think in terms of when balancing a split.
 */
export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Other",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Distinct accent colour per group (readable on the near-black surfaces). */
export const GROUP_COLOR: Record<MuscleGroup, string> = {
  Chest: "#10B981", // emerald (brand accent)
  Back: "#3B82F6", // blue
  Shoulders: "#F59E0B", // amber
  Arms: "#A855F7", // violet
  Legs: "#EF4444", // red
  Core: "#14B8A6", // teal
  Other: "#8A94A6", // muted grey
};

const PRIMARY_TO_GROUP: Record<string, MuscleGroup> = {
  Chest: "Chest",
  Lats: "Back",
  "Upper Back": "Back",
  Back: "Back",
  Shoulders: "Shoulders",
  Biceps: "Arms",
  Triceps: "Arms",
  Quadriceps: "Legs",
  Hamstrings: "Legs",
  Glutes: "Legs",
  Calves: "Legs",
  Abs: "Core",
};

/** Map an exercise's display name to its training group (best effort). */
export function groupForExercise(name: string): MuscleGroup {
  const primary = findExercise(name)?.primaryMuscle;
  return (primary && PRIMARY_TO_GROUP[primary]) || "Other";
}

// ── Granular per-muscle palette (used by the workout-finish doughnut and the
// exercise detail). One stable colour per primary muscle, reused everywhere so
// "Chest" is always the same green, "Lats" always the same blue, etc. ───────
export const MUSCLE_COLOR: Record<string, string> = {
  Chest: "#10B981", // emerald (brand accent)
  Shoulders: "#F59E0B", // amber
  Lats: "#3B82F6", // blue
  "Upper Back": "#6366F1", // indigo
  Back: "#2563EB", // deep blue
  Biceps: "#A855F7", // violet
  Triceps: "#EC4899", // pink
  Quadriceps: "#EF4444", // red
  Hamstrings: "#F97316", // orange
  Glutes: "#14B8A6", // teal
  Calves: "#84CC16", // lime
  Abs: "#06B6D4", // cyan
  Other: "#8A94A6", // muted grey
};

/** Stable colour for a primary muscle (falls back to muted grey). */
export function muscleColor(muscle: string): string {
  return MUSCLE_COLOR[muscle] ?? MUSCLE_COLOR.Other;
}

/** Primary muscle for a workout exercise: denormalized field, else library. */
export function primaryMuscleFor(ex: WorkoutExercise): string {
  return ex.bodyPart || findExercise(ex.exerciseName)?.primaryMuscle || "Other";
}

export interface MuscleVolume {
  muscle: string;
  kg: number;
  pct: number; // share of total volume, 0–100
  color: string;
}

/**
 * Volume (weight × reps) by primary muscle for a single workout's completed
 * sets, newest convention. Returns muscles with volume > 0, biggest first,
 * each with its share of the total — the data the finish doughnut renders.
 */
export function volumeByMuscle(workout: Workout): MuscleVolume[] {
  const totals = new Map<string, number>();
  for (const ex of workout.exercises) {
    const muscle = primaryMuscleFor(ex);
    for (const s of ex.sets) {
      if (s.completed && s.weightKg != null && s.reps != null) {
        totals.set(muscle, (totals.get(muscle) ?? 0) + s.weightKg * s.reps);
      }
    }
  }
  const grand = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  if (grand <= 0) return [];
  return Array.from(totals.entries())
    .map(([muscle, kg]) => ({
      muscle,
      kg: Math.round(kg),
      pct: (kg / grand) * 100,
      color: muscleColor(muscle),
    }))
    .sort((a, b) => b.kg - a.kg);
}

export type Metric = "sets" | "volume";

export interface GroupTotal {
  group: MuscleGroup;
  value: number;
  color: string;
}

/**
 * Tally completed sets (or volume in kg) per muscle group across the given
 * workouts. Returns one entry per group that has any data, in canonical order.
 */
export function muscleGroupTotals(
  workouts: Workout[],
  metric: Metric
): GroupTotal[] {
  const totals = new Map<MuscleGroup, number>();
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    for (const ex of w.exercises) {
      const group = groupForExercise(ex.exerciseName);
      for (const s of ex.sets) {
        if (!s.completed) continue;
        const add =
          metric === "sets"
            ? 1
            : s.weightKg != null && s.reps != null
              ? s.weightKg * s.reps
              : 0;
        if (add > 0 || metric === "sets") {
          totals.set(group, (totals.get(group) ?? 0) + add);
        }
      }
    }
  }
  return MUSCLE_GROUPS.filter((g) => (totals.get(g) ?? 0) > 0).map((g) => ({
    group: g,
    value: Math.round(totals.get(g) ?? 0),
    color: GROUP_COLOR[g],
  }));
}
