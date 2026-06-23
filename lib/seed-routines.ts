import type { Routine, RoutineExercise, ExerciseMode } from "./types";
import { findExercise } from "./exercises";

// Compact prescription used to author the seed; resolved to full
// RoutineExercise objects (with slug / muscle / equipment) below.
interface Pres {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  mode: ExerciseMode; // "both" = every session, "solo" = solo-only extra
}

interface SeedRoutine {
  id: string;
  name: string;
  exercises: Pres[];
}

// The 4-day Zeus programme. Core lifts are `both`; the extra solo volume is
// `solo`. "With Friend" sessions load only `both`; "Solo" loads everything.
const SEED: SeedRoutine[] = [
  {
    id: "seed-push",
    name: "Push — Chest & Shoulders",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "6-8", rest: 180, mode: "both" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", rest: 120, mode: "both" },
      { name: "Dumbbell Lateral Raise", sets: 4, reps: "15-20", rest: 90, mode: "both" },
      { name: "Overhead Press (Barbell)", sets: 3, reps: "8-10", rest: 120, mode: "both" },
      { name: "Seated Dumbbell Fly", sets: 3, reps: "12-15", rest: 60, mode: "both" },
      { name: "Rear Delt Fly (Cable)", sets: 3, reps: "15", rest: 90, mode: "solo" },
      { name: "Overhead Tricep Extension (Cable)", sets: 3, reps: "12", rest: 60, mode: "solo" },
    ],
  },
  {
    id: "seed-pull",
    name: "Pull — Back & Biceps",
    exercises: [
      { name: "Assisted Pull-Up", sets: 4, reps: "6-8", rest: 180, mode: "both" },
      { name: "Lat Pulldown (Cable)", sets: 3, reps: "10-12", rest: 120, mode: "both" },
      { name: "Seated Cable Row (V-Grip)", sets: 3, reps: "10-12", rest: 120, mode: "both" },
      { name: "Face Pull", sets: 3, reps: "15-20", rest: 90, mode: "both" },
      { name: "Preacher Curl (Barbell)", sets: 3, reps: "8-10", rest: 90, mode: "both" },
      { name: "Chest Supported Incline Row (Dumbbell)", sets: 3, reps: "10-12", rest: 90, mode: "solo" },
      { name: "Hammer Curl (Cable)", sets: 3, reps: "10-12", rest: 60, mode: "solo" },
    ],
  },
  {
    id: "seed-legs",
    name: "Legs",
    exercises: [
      { name: "Squat (Barbell)", sets: 4, reps: "6-8", rest: 180, mode: "both" },
      { name: "Romanian Deadlift (Dumbbell)", sets: 3, reps: "10-12", rest: 120, mode: "both" },
      { name: "Leg Curl (Machine)", sets: 3, reps: "12-15", rest: 90, mode: "both" },
      { name: "Calf Raise (Machine)", sets: 3, reps: "15-20", rest: 60, mode: "both" },
      { name: "Leg Press (Machine)", sets: 3, reps: "12-15", rest: 90, mode: "solo" },
      { name: "Hanging Leg Raise", sets: 3, reps: "10-15", rest: 60, mode: "solo" },
    ],
  },
  {
    id: "seed-upper",
    name: "Upper — Shoulders & Arms",
    exercises: [
      { name: "Arnold Press (Dumbbell)", sets: 4, reps: "10-12", rest: 150, mode: "both" },
      { name: "Dumbbell Lateral Raise", sets: 4, reps: "15-20", rest: 90, mode: "both" },
      { name: "Chest Dip (Assisted)", sets: 3, reps: "8-10", rest: 120, mode: "both" },
      { name: "Rear Delt Fly (Dumbbell)", sets: 3, reps: "15", rest: 90, mode: "both" },
      { name: "Triceps Rope Pushdown", sets: 3, reps: "12-15", rest: 60, mode: "both" },
      { name: "Incline Curl (Dumbbell)", sets: 3, reps: "10-12", rest: 60, mode: "both" },
      { name: "Skull Crusher (Barbell)", sets: 3, reps: "12", rest: 90, mode: "solo" },
      { name: "Cable Chest Fly (Low to High)", sets: 3, reps: "12-15", rest: 90, mode: "solo" },
      { name: "Hammer Curl (Cable)", sets: 3, reps: "10-12", rest: 60, mode: "solo" },
    ],
  },
];

function resolve(routine: SeedRoutine): Routine {
  const exercises: RoutineExercise[] = routine.exercises.map((p, i) => {
    const def = findExercise(p.name);
    return {
      id: `${routine.id}-ex-${i + 1}`,
      exerciseName: p.name,
      slug: def?.slug ?? null,
      primaryMuscle: def?.primaryMuscle ?? "",
      equipment: def?.equipment ?? "",
      sets: p.sets,
      reps: p.reps,
      restSeconds: p.rest,
      order: i + 1,
      mode: p.mode,
    };
  });
  return {
    id: routine.id,
    name: routine.name,
    createdAt: "2024-01-01T00:00:00.000Z",
    exercises,
  };
}

/** The 4 pre-loaded routines, fully resolved with slugs and metadata. */
export const SEED_ROUTINES: Routine[] = SEED.map(resolve);

/** A human "X sets of Y reps" target string used to pre-fill exercise notes. */
export function targetNote(sets: number, reps: string): string {
  return `${sets} sets of ${reps} reps`;
}
