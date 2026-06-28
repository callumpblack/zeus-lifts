// Shared domain types for Zeus Lifts.

export type RoutineMode = "with_friend" | "solo";

// `both` exercises appear in every session; `solo` exercises are the extra
// volume added only when training alone.
export type ExerciseMode = "both" | "solo";

/** A single exercise prescription within a saved routine. */
export interface RoutineExercise {
  id: string;
  exerciseName: string;
  slug: string | null;
  primaryMuscle: string;
  equipment: string;
  sets: number;
  reps: string; // e.g. "6-8"
  restSeconds: number;
  order: number;
  mode: ExerciseMode;
}

/** A saved routine (e.g. "Push — Chest & Shoulders"). */
export interface Routine {
  id: string;
  name: string;
  createdAt: string;
  exercises: RoutineExercise[];
}

/** A logged set inside an active or completed workout. */
export interface WorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  completedAt?: string | null;
  // Assistance load for bodyweight-assisted exercises (e.g. assisted pull-up).
  // The actual lifted weight (bodyweight − assistance) is stored in weightKg so
  // volume/PR/history work unchanged.
  assistanceKg?: number | null;
  // Drop sets reference their parent set; null/undefined for top-level sets.
  parentSetId?: string | null;
  // Previous performance for this set index, pulled from history. UI-only.
  previous?: { weightKg: number; reps: number } | null;
}

/** An exercise block inside an active or completed workout. */
export interface WorkoutExercise {
  id: string;
  exerciseName: string;
  slug: string | null;
  notes: string;
  order: number;
  sets: WorkoutSet[];
  restSeconds: number; // current rest-timer duration for this block
  restEnabled: boolean;
  // Epoch ms the current rest countdown started. Bumped each time a set is
  // completed so the timer restarts from full. UI-only (not persisted to DB).
  restStartedAt?: number | null;
  // True for assisted exercises (input = assistance, lifted = bodyweight − assistance).
  requiresBodyweight?: boolean;
  // Exercises sharing the same id are rendered together as a superset.
  supersetGroup?: string | null;
  // Self-rated toughness for this exercise (1–10), set on the finish screen.
  toughness?: number | null;
  // Primary muscle group, denormalized at save time for fast volume-by-muscle
  // charts (avoids re-deriving from the exercise library). See lib/exercises.
  bodyPart?: string | null;
}

/** A workout — in progress or completed. */
export interface Workout {
  id: string;
  routineId: string | null;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  notes: string;
  exercises: WorkoutExercise[];
  // Random celebratory animal picked at finish (see lib/animals.ts).
  animalName?: string | null;
  animalEmoji?: string | null;
}

/** A row in the exercise picker library. */
export interface ExerciseDef {
  name: string;
  slug: string | null;
  primaryMuscle: string;
  equipment: string;
  // Assisted/bodyweight exercises logged as bodyweight − assistance.
  requiresBodyweight?: boolean;
}

/**
 * Enrichment for an exercise sourced from the hasaneyldrm/exercises dataset
 * (see scripts/build-exercises.mjs → lib/exercise-media.generated.json).
 */
export interface ExerciseMedia {
  datasetId: string;
  datasetName: string;
  /** Absolute animated-GIF URL, or null when the dataset has no usable gif. */
  gifUrl: string | null;
  /** Dataset's coarse body part (e.g. "chest", "upper legs"). */
  bodyPart: string;
  /** Primary target muscle (e.g. "pectorals"). */
  target: string;
  secondaryMuscles: string[];
}

/** Everything the /exercise/[name] detail modal needs to render. */
export interface ExerciseDetail {
  name: string;
  slug: string | null;
  primaryMuscle: string;
  equipment: string;
  gifUrl: string | null;
  secondaryMuscles: string[];
}

/** Summary stats shown after finishing a workout. */
export interface WorkoutSummary {
  durationSeconds: number;
  volumeKg: number;
  setsCompleted: number;
  prs: { exerciseName: string; weightKg: number; reps: number }[];
  animal?: { name: string; emoji: string } | null;
}

/** Persona chosen on first login. Zeus starts with the 4 routines; Hera blank. */
export type Persona = "zeus" | "hera";

/** Per-user profile: username, persona + bodyweight (for assisted exercises). */
export interface Profile {
  username: string | null;
  persona: Persona | null;
  bodyweightKg: number | null;
  updatedAt: string;
}
