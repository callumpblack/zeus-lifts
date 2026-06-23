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
}

/** A row in the exercise picker library. */
export interface ExerciseDef {
  name: string;
  slug: string | null;
  primaryMuscle: string;
  equipment: string;
}

/** Summary stats shown after finishing a workout. */
export interface WorkoutSummary {
  durationSeconds: number;
  volumeKg: number;
  setsCompleted: number;
  prs: { exerciseName: string; weightKg: number; reps: number }[];
}
