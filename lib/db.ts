"use client";

import type {
  Persona,
  Profile,
  Routine,
  RoutineExercise,
  RoutineMode,
  Workout,
} from "./types";
import { SEED_ROUTINES } from "./seed-routines";
import { uid } from "./format";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Persistence layer. Two interchangeable back ends behind one async API:
 *   • Supabase (Postgres)  — used when NEXT_PUBLIC_SUPABASE_* env vars are set
 *   • localStorage         — automatic fallback so the app works with zero setup
 *
 * Both use identical text IDs, so data shapes are symmetrical across stores.
 */

const LS_ROUTINES = "zeus.routines.v1";
const LS_WORKOUTS = "zeus.workouts.v1";
const LS_PROFILE = "zeus.profile.v1";

// ── Mode helper ───────────────────────────────────────────────────────────
/** Exercises to load for a session: with_friend = core only, solo = all. */
export function exercisesForMode(
  routine: Routine,
  mode: RoutineMode
): RoutineExercise[] {
  const list =
    mode === "with_friend"
      ? routine.exercises.filter((e) => e.mode === "both")
      : routine.exercises;
  return [...list].sort((a, b) => a.order - b.order);
}

// ── localStorage helpers ────────────────────────────────────────────────────
function lsRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function lsRoutines(): Routine[] {
  const stored = lsRead<Routine[] | null>(LS_ROUTINES, null);
  if (!stored) {
    lsWrite(LS_ROUTINES, SEED_ROUTINES);
    return SEED_ROUTINES;
  }
  return stored;
}

// ── Routines ────────────────────────────────────────────────────────────────
export async function getRoutines(): Promise<Routine[]> {
  const sb = getSupabase();
  if (!sb) return lsRoutines();

  const { data: routines, error } = await sb
    .from("routines")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });
  if (error || !routines) return lsRoutines();

  const { data: exRows } = await sb
    .from("routine_exercises")
    .select(
      'id, routine_id, exercise_name, slug, primary_muscle, equipment, sets, reps, rest_seconds, "order", mode'
    )
    .order("order", { ascending: true });

  return routines.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    exercises: (exRows ?? [])
      .filter((e) => e.routine_id === r.id)
      .map((e) => ({
        id: e.id,
        exerciseName: e.exercise_name,
        slug: e.slug,
        primaryMuscle: e.primary_muscle ?? "",
        equipment: e.equipment ?? "",
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.rest_seconds,
        order: e.order,
        mode: e.mode,
      })),
  }));
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const all = await getRoutines();
  return all.find((r) => r.id === id) ?? null;
}

export async function createRoutine(routine: Routine): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    const all = lsRoutines();
    const idx = all.findIndex((r) => r.id === routine.id);
    if (idx >= 0) all[idx] = routine;
    else all.push(routine);
    lsWrite(LS_ROUTINES, all);
    return;
  }

  // Upsert routine, then replace its exercises.
  await sb.from("routines").upsert({
    id: routine.id,
    name: routine.name,
    created_at: routine.createdAt,
  });
  await sb.from("routine_exercises").delete().eq("routine_id", routine.id);
  await sb.from("routine_exercises").insert(
    routine.exercises.map((e) => ({
      id: e.id,
      routine_id: routine.id,
      exercise_name: e.exerciseName,
      slug: e.slug,
      primary_muscle: e.primaryMuscle,
      equipment: e.equipment,
      sets: e.sets,
      reps: e.reps,
      rest_seconds: e.restSeconds,
      order: e.order,
      mode: e.mode,
    }))
  );
}

export async function deleteRoutine(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    lsWrite(
      LS_ROUTINES,
      lsRoutines().filter((r) => r.id !== id)
    );
    return;
  }
  await sb.from("routine_exercises").delete().eq("routine_id", id);
  await sb.from("routines").delete().eq("id", id);
}

// ── Workouts ────────────────────────────────────────────────────────────────
export async function getWorkouts(): Promise<Workout[]> {
  const sb = getSupabase();
  if (!sb) {
    return lsRead<Workout[]>(LS_WORKOUTS, []).sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  const { data: workouts, error } = await sb
    .from("workouts")
    .select(
      "id, routine_id, name, started_at, finished_at, notes, animal_name, animal_emoji"
    )
    .order("started_at", { ascending: false });
  if (error || !workouts) return [];

  const { data: exRows } = await sb
    .from("workout_exercises")
    .select(
      'id, workout_id, exercise_name, slug, notes, "order", requires_bodyweight, superset_group'
    )
    .order("order", { ascending: true });
  const { data: setRows } = await sb
    .from("workout_sets")
    .select(
      "id, workout_exercise_id, set_number, weight_kg, reps, completed, completed_at, assistance_kg, parent_set_id"
    )
    .order("set_number", { ascending: true });

  return workouts.map((w) => ({
    id: w.id,
    routineId: w.routine_id,
    name: w.name,
    startedAt: w.started_at,
    finishedAt: w.finished_at,
    notes: w.notes ?? "",
    animalName: w.animal_name ?? null,
    animalEmoji: w.animal_emoji ?? null,
    exercises: (exRows ?? [])
      .filter((e) => e.workout_id === w.id)
      .map((e) => ({
        id: e.id,
        exerciseName: e.exercise_name,
        slug: e.slug,
        notes: e.notes ?? "",
        order: e.order,
        restSeconds: 60,
        restEnabled: false,
        requiresBodyweight: e.requires_bodyweight ?? false,
        supersetGroup: e.superset_group ?? null,
        sets: (setRows ?? [])
          .filter((s) => s.workout_exercise_id === e.id)
          .map((s) => ({
            id: s.id,
            setNumber: s.set_number,
            weightKg: s.weight_kg,
            reps: s.reps,
            completed: s.completed,
            completedAt: s.completed_at,
            assistanceKg: s.assistance_kg ?? null,
            parentSetId: s.parent_set_id ?? null,
          })),
      })),
  }));
}

export async function saveWorkout(workout: Workout): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    const all = lsRead<Workout[]>(LS_WORKOUTS, []);
    all.push(workout);
    lsWrite(LS_WORKOUTS, all);
    return;
  }

  await sb.from("workouts").insert({
    id: workout.id,
    routine_id: workout.routineId,
    name: workout.name,
    started_at: workout.startedAt,
    finished_at: workout.finishedAt,
    notes: workout.notes,
    animal_name: workout.animalName ?? null,
    animal_emoji: workout.animalEmoji ?? null,
  });

  for (const ex of workout.exercises) {
    await sb.from("workout_exercises").insert({
      id: ex.id,
      workout_id: workout.id,
      exercise_name: ex.exerciseName,
      slug: ex.slug,
      notes: ex.notes,
      order: ex.order,
      requires_bodyweight: ex.requiresBodyweight ?? false,
      superset_group: ex.supersetGroup ?? null,
    });
    const sets = ex.sets.filter((s) => s.weightKg != null || s.reps != null);
    if (sets.length) {
      // Insert top-level sets before drop-set children (self-referencing FK).
      const ordered = [...sets].sort(
        (a, b) => (a.parentSetId ? 1 : 0) - (b.parentSetId ? 1 : 0)
      );
      await sb.from("workout_sets").insert(
        ordered.map((s) => ({
          id: s.id,
          workout_exercise_id: ex.id,
          set_number: s.setNumber,
          weight_kg: s.weightKg,
          reps: s.reps,
          completed: s.completed,
          completed_at: s.completedAt ?? null,
          assistance_kg: s.assistanceKg ?? null,
          parent_set_id: s.parentSetId ?? null,
        }))
      );
    }
  }
}

// ── Profile (per-user when authenticated) ────────────────────────────────────
const EMPTY_PROFILE: Profile = {
  persona: null,
  bodyweightKg: null,
  updatedAt: "",
};

export async function getProfile(): Promise<Profile> {
  const sb = getSupabase();
  if (!sb) return lsRead<Profile>(LS_PROFILE, EMPTY_PROFILE);

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return EMPTY_PROFILE;

  const { data, error } = await sb
    .from("profile")
    .select("persona, bodyweight_kg, updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return EMPTY_PROFILE;
  return {
    persona: (data.persona as Persona) ?? null,
    bodyweightKg: data.bodyweight_kg ?? null,
    updatedAt: data.updated_at ?? "",
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    lsWrite(LS_PROFILE, profile);
    return;
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("profile").upsert({
    id: user.id,
    persona: profile.persona,
    bodyweight_kg: profile.bodyweightKg,
    updated_at: profile.updatedAt,
  });
}

/**
 * Clone the 4 Zeus routines into the current account with fresh ids. Called on
 * first login when the user picks the Zeus persona. Fresh ids mean two separate
 * Zeus accounts each get their own independent copies (no shared rows).
 */
export async function seedZeusRoutines(): Promise<void> {
  const now = new Date().toISOString();
  for (const r of SEED_ROUTINES) {
    await createRoutine({
      id: uid("rt"),
      name: r.name,
      createdAt: now,
      exercises: r.exercises.map((e) => ({ ...e, id: uid("re") })),
    });
  }
}

/** Sign out and wipe this browser's local Zeus data (drafts, cached fallback). */
export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  if (typeof window !== "undefined") {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith("zeus.")) window.localStorage.removeItem(k);
    }
  }
}

// ── History lookup for the "PREVIOUS" column ────────────────────────────────
/**
 * Most recent completed performance of an exercise, keyed by set number.
 * Returns an empty map when there's no history (UI then shows "–").
 */
export async function getLastPerformance(
  exerciseName: string
): Promise<Map<number, { weightKg: number; reps: number }>> {
  const result = new Map<number, { weightKg: number; reps: number }>();
  const workouts = await getWorkouts(); // already newest-first

  for (const w of workouts) {
    if (!w.finishedAt) continue;
    const ex = w.exercises.find((e) => e.exerciseName === exerciseName);
    if (!ex) continue;
    const done = ex.sets.filter(
      (s) => s.completed && s.weightKg != null && s.reps != null
    );
    if (done.length === 0) continue;
    for (const s of done) {
      result.set(s.setNumber, {
        weightKg: s.weightKg as number,
        reps: s.reps as number,
      });
    }
    break; // newest workout with this exercise wins
  }
  return result;
}

export const usingSupabase = isSupabaseConfigured;
