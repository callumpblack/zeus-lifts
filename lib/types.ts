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
  // True for assisted exercises (input = assistance, lifted = bodyweight − assistance).
  requiresBodyweight?: boolean;
  // Exercises sharing the same id are rendered together as a superset.
  supersetGroup?: string | null;
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

/** Per-user profile: persona + bodyweight (used for assisted exercises). */
export interface Profile {
  persona: Persona | null;
  bodyweightKg: number | null;
  updatedAt: string;
}
