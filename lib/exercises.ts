import type { ExerciseDef } from "./types";

// Base URL for exercise photos from the open-source wrkout/exercises.json repo.
// Folder structure: exercises/<slug>/images/0.jpg (and 1.jpg).
const IMAGE_BASE =
  "https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises";

/**
 * Build the raw GitHub image URL for an exercise slug.
 * `imageIndex` 0 = first photo, 1 = second. Returns null when no slug is known
 * (the UI then renders the grey dumbbell fallback).
 */
export function imageUrl(slug: string | null, imageIndex: 0 | 1 = 0): string | null {
  if (!slug) return null;
  return `${IMAGE_BASE}/${slug}/images/${imageIndex}.jpg`;
}

/**
 * The exercise library. Every slug below was verified to resolve to a real
 * photo folder in the wrkout/exercises.json repo, so images load reliably.
 * Includes all exercises across the 4 Zeus routines plus common gym lifts so
 * the picker is useful for ad-hoc / empty workouts. Names are the canonical
 * display names used as the key across the app.
 */
export const EXERCISE_LIBRARY: ExerciseDef[] = [
  // ── Chest ──
  { name: "Barbell Bench Press", slug: "Barbell_Bench_Press_-_Medium_Grip", primaryMuscle: "Chest", equipment: "Barbell" },
  { name: "Incline Bench Press (Barbell)", slug: "Barbell_Incline_Bench_Press_-_Medium_Grip", primaryMuscle: "Chest", equipment: "Barbell" },
  { name: "Incline Dumbbell Press", slug: "Incline_Dumbbell_Press", primaryMuscle: "Chest", equipment: "Dumbbell" },
  { name: "Seated Dumbbell Fly", slug: "Dumbbell_Flyes", primaryMuscle: "Chest", equipment: "Dumbbell" },
  { name: "Cable Chest Fly (Low to High)", slug: "Low_Cable_Crossover", primaryMuscle: "Chest", equipment: "Cable" },
  { name: "Cable Crossover", slug: "Cable_Crossover", primaryMuscle: "Chest", equipment: "Cable" },
  { name: "Chest Dip (Assisted)", slug: "Dips_-_Chest_Version", primaryMuscle: "Chest", equipment: "Machine" },
  { name: "Push Up", slug: "Pushups", primaryMuscle: "Chest", equipment: "Bodyweight" },

  // ── Shoulders ──
  { name: "Overhead Press (Barbell)", slug: "Standing_Military_Press", primaryMuscle: "Shoulders", equipment: "Barbell" },
  { name: "Overhead Press (Dumbbell)", slug: "Dumbbell_Shoulder_Press", primaryMuscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Arnold Press (Dumbbell)", slug: "Arnold_Dumbbell_Press", primaryMuscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Dumbbell Lateral Raise", slug: "Side_Lateral_Raise", primaryMuscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Rear Delt Fly (Cable)", slug: "Cable_Rear_Delt_Fly", primaryMuscle: "Shoulders", equipment: "Cable" },
  { name: "Rear Delt Fly (Dumbbell)", slug: "Reverse_Flyes", primaryMuscle: "Shoulders", equipment: "Dumbbell" },
  { name: "Face Pull", slug: "Face_Pull", primaryMuscle: "Shoulders", equipment: "Cable" },

  // ── Back ──
  { name: "Assisted Pull-Up", slug: "Band_Assisted_Pull-Up", primaryMuscle: "Lats", equipment: "Machine" },
  { name: "Pull Up", slug: "Pullups", primaryMuscle: "Lats", equipment: "Bodyweight" },
  { name: "Lat Pulldown (Cable)", slug: "Wide-Grip_Lat_Pulldown", primaryMuscle: "Lats", equipment: "Cable" },
  { name: "Lat Pulldown (Close Grip)", slug: "Close-Grip_Front_Lat_Pulldown", primaryMuscle: "Lats", equipment: "Cable" },
  { name: "Seated Cable Row (V-Grip)", slug: "Seated_Cable_Rows", primaryMuscle: "Upper Back", equipment: "Cable" },
  { name: "Chest Supported Incline Row (Dumbbell)", slug: "Dumbbell_Incline_Row", primaryMuscle: "Upper Back", equipment: "Dumbbell" },
  { name: "Bent Over Row (Barbell)", slug: "Bent_Over_Barbell_Row", primaryMuscle: "Upper Back", equipment: "Barbell" },
  { name: "Deadlift (Barbell)", slug: "Barbell_Deadlift", primaryMuscle: "Back", equipment: "Barbell" },

  // ── Biceps ──
  { name: "Preacher Curl (Barbell)", slug: "Preacher_Curl", primaryMuscle: "Biceps", equipment: "Barbell" },
  { name: "Barbell Curl", slug: "Barbell_Curl", primaryMuscle: "Biceps", equipment: "Barbell" },
  { name: "Incline Curl (Dumbbell)", slug: "Incline_Dumbbell_Curl", primaryMuscle: "Biceps", equipment: "Dumbbell" },
  { name: "Bicep Curl (Dumbbell)", slug: "Dumbbell_Alternate_Bicep_Curl", primaryMuscle: "Biceps", equipment: "Dumbbell" },
  { name: "Hammer Curl (Cable)", slug: "Cable_Hammer_Curls_-_Rope_Attachment", primaryMuscle: "Biceps", equipment: "Cable" },

  // ── Triceps ──
  { name: "Triceps Rope Pushdown", slug: "Triceps_Pushdown_-_Rope_Attachment", primaryMuscle: "Triceps", equipment: "Cable" },
  { name: "Tricep Pushdown (V-Bar)", slug: "Triceps_Pushdown_-_V-Bar_Attachment", primaryMuscle: "Triceps", equipment: "Cable" },
  { name: "Overhead Tricep Extension (Cable)", slug: "Cable_Rope_Overhead_Triceps_Extension", primaryMuscle: "Triceps", equipment: "Cable" },
  { name: "Skull Crusher (Barbell)", slug: "EZ-Bar_Skullcrusher", primaryMuscle: "Triceps", equipment: "Barbell" },
  { name: "Bench Dips", slug: "Bench_Dips", primaryMuscle: "Triceps", equipment: "Bodyweight" },

  // ── Legs ──
  { name: "Squat (Barbell)", slug: "Barbell_Full_Squat", primaryMuscle: "Quadriceps", equipment: "Barbell" },
  { name: "Leg Press (Machine)", slug: "Leg_Press", primaryMuscle: "Quadriceps", equipment: "Machine" },
  { name: "Goblet Squat", slug: "Goblet_Squat", primaryMuscle: "Quadriceps", equipment: "Dumbbell" },
  { name: "Lunge (Dumbbell)", slug: "Dumbbell_Lunges", primaryMuscle: "Quadriceps", equipment: "Dumbbell" },
  { name: "Romanian Deadlift (Dumbbell)", slug: "Romanian_Deadlift", primaryMuscle: "Hamstrings", equipment: "Dumbbell" },
  { name: "Leg Curl (Machine)", slug: "Lying_Leg_Curls", primaryMuscle: "Hamstrings", equipment: "Machine" },
  { name: "Seated Leg Curl", slug: "Seated_Leg_Curl", primaryMuscle: "Hamstrings", equipment: "Machine" },
  { name: "Hip Thrust", slug: "Barbell_Hip_Thrust", primaryMuscle: "Glutes", equipment: "Barbell" },
  { name: "Calf Raise (Machine)", slug: "Standing_Calf_Raises", primaryMuscle: "Calves", equipment: "Machine" },

  // ── Core ──
  { name: "Hanging Leg Raise", slug: "Hanging_Leg_Raise", primaryMuscle: "Abs", equipment: "Bodyweight" },
  { name: "Plank", slug: "Plank", primaryMuscle: "Abs", equipment: "Bodyweight" },
];

const BY_NAME = new Map(EXERCISE_LIBRARY.map((e) => [e.name, e]));

/** Look up an exercise definition by its canonical display name. */
export function findExercise(name: string): ExerciseDef | undefined {
  return BY_NAME.get(name);
}

/** Resolve a slug for a name, falling back to a best-effort folder-style slug. */
export function slugFor(name: string): string | null {
  return BY_NAME.get(name)?.slug ?? null;
}

export const ALL_EQUIPMENT = [
  "All Equipment",
  ...Array.from(new Set(EXERCISE_LIBRARY.map((e) => e.equipment))).sort(),
];

export const ALL_MUSCLES = [
  "All Muscles",
  ...Array.from(new Set(EXERCISE_LIBRARY.map((e) => e.primaryMuscle))).sort(),
];
