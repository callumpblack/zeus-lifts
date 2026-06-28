"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ExerciseDef,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSummary,
} from "@/lib/types";
import {
  getLastPerformance,
  getProfile,
  getWorkouts,
  saveWorkout,
} from "@/lib/db";
import { randomAnimal } from "@/lib/animals";
import {
  primaryMuscleFor,
  volumeByMuscle,
  type MuscleVolume,
} from "@/lib/muscle-groups";
import {
  completedSetCount,
  formatDuration,
  uid,
  workoutDurationSeconds,
  workoutVolume,
} from "@/lib/format";
import { primeAudio } from "@/lib/sound";
import ExerciseBlock from "./ExerciseBlock";
import SupersetBlock from "./SupersetBlock";
import ExercisePicker from "./ExercisePicker";
import ToughnessRating from "./ToughnessRating";
import WorkoutSummaryView from "./WorkoutSummary";
import {
  ChevronDownIcon,
  ClockIcon,
  DumbbellIcon,
  PlusIcon,
} from "./icons";

interface Props {
  routineId: string | null;
  routineName: string;
  initialExercises: WorkoutExercise[];
}

export default function WorkoutLogger({
  routineId,
  routineName,
  initialExercises,
}: Props) {
  const router = useRouter();
  const draftKey = `zeus.draft.${routineId ?? "empty"}`;

  // ── Workout state (resumes an unfinished draft when present) ──────────────
  const [workout, setWorkout] = useState<Workout>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(draftKey);
        if (raw) {
          const draft = JSON.parse(raw) as Workout;
          if (draft && !draft.finishedAt) return draft;
        }
      } catch {
        /* ignore malformed draft */
      }
    }
    return {
      id: uid("wk"),
      routineId,
      name: routineName,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      notes: "",
      exercises: initialExercises,
    };
  });

  const [now, setNow] = useState(() => Date.now());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [breakdown, setBreakdown] = useState<MuscleVolume[]>([]);
  const [rating, setRating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(null);

  // Cache of previous performance per exercise, used when adding sets.
  const prevMaps = useRef<
    Map<string, Map<number, { weightKg: number; reps: number }>>
  >(new Map());

  // Open superset pairing: the next added exercise joins this group id.
  const pendingSupersetRef = useRef<string | null>(null);

  // Live duration ticker.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist draft on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(workout));
    } catch {
      /* storage full / unavailable */
    }
  }, [workout, draftKey]);

  // Load bodyweight from profile, then recompute lifted weight for any assisted
  // sets that already have an assistance value (e.g. a resumed draft).
  useEffect(() => {
    let active = true;
    (async () => {
      const p = await getProfile();
      if (!active) return;
      setBodyweightKg(p.bodyweightKg);
      if (p.bodyweightKg == null) return;
      const bw = p.bodyweightKg;
      setWorkout((w) => ({
        ...w,
        exercises: w.exercises.map((ex) =>
          ex.requiresBodyweight
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.assistanceKg != null
                    ? { ...s, weightKg: Math.max(0, bw - s.assistanceKg) }
                    : s
                ),
              }
            : ex
        ),
      }));
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load "previous" performance for all exercises + recent list for the picker.
  useEffect(() => {
    let active = true;
    (async () => {
      // Recent exercises from history (most-recent-first, de-duped).
      const history = await getWorkouts();
      const seen = new Set<string>();
      const recents: string[] = [];
      for (const w of history) {
        for (const ex of w.exercises) {
          if (!seen.has(ex.exerciseName)) {
            seen.add(ex.exerciseName);
            recents.push(ex.exerciseName);
          }
        }
      }
      if (active) setRecentNames(recents);

      // Previous performance per exercise currently in the workout.
      const names = Array.from(
        new Set(workout.exercises.map((e) => e.exerciseName))
      );
      const entries = await Promise.all(
        names.map(async (n) => [n, await getLastPerformance(n)] as const)
      );
      if (!active) return;
      for (const [n, m] of entries) prevMaps.current.set(n, m);
      setWorkout((w) => ({
        ...w,
        exercises: w.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({
            ...s,
            previous: prevMaps.current.get(ex.exerciseName)?.get(s.setNumber) ?? null,
          })),
        })),
      }));
    })();
    return () => {
      active = false;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const durationSeconds = workoutDurationSeconds(workout, now);
  const volume = useMemo(() => workoutVolume(workout), [workout]);
  const sets = useMemo(() => completedSetCount(workout), [workout]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  function patchExercise(exId: string, patch: Partial<WorkoutExercise>) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((ex) =>
        ex.id === exId ? { ...ex, ...patch } : ex
      ),
    }));
  }

  function addSet(exId: string) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        // Number by top-level sets only (drop sets don't get their own number).
        const nextNumber = ex.sets.filter((s) => !s.parentSetId).length + 1;
        const prev = prevMaps.current.get(ex.exerciseName)?.get(nextNumber) ?? null;
        const newSet: WorkoutSet = {
          id: uid("set"),
          setNumber: nextNumber,
          weightKg: null,
          reps: null,
          completed: false,
          previous: prev,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    }));
  }

  function addDropSet(exId: string, parentSetId: string) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const parent = ex.sets.find((s) => s.id === parentSetId);
        const dropSet: WorkoutSet = {
          id: uid("set"),
          setNumber: parent?.setNumber ?? ex.sets.length + 1,
          weightKg: null,
          reps: null,
          completed: false,
          parentSetId,
        };
        // Insert the drop set immediately after the parent (and its existing drops).
        const sets = [...ex.sets];
        let insertAt = sets.findIndex((s) => s.id === parentSetId) + 1;
        while (insertAt < sets.length && sets[insertAt].parentSetId === parentSetId) {
          insertAt += 1;
        }
        sets.splice(insertAt, 0, dropSet);
        return { ...ex, sets };
      }),
    }));
  }

  function toggleSet(exId: string, setId: string) {
    // Unlock the AudioContext from this user gesture so the timer can chime later.
    primeAudio();
    setWorkout((w) => {
      let justCompleted = false;
      let exercises = w.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            justCompleted = !s.completed;
            return {
              ...s,
              completed: !s.completed,
              completedAt: !s.completed ? new Date().toISOString() : null,
            };
          }),
        };
      });

      const ex = exercises.find((e) => e.id === exId);
      if (justCompleted && ex?.supersetGroup) {
        // Superset: once a round is complete across the pair (every grouped
        // exercise has the same number of completed top-level sets), (re)start
        // the shared rest timer on the group's head exercise.
        const group = exercises.filter((e) => e.supersetGroup === ex.supersetGroup);
        const counts = group.map(
          (e) => e.sets.filter((s) => !s.parentSetId && s.completed).length
        );
        const roundDone = counts.every((c) => c > 0 && c === counts[0]);
        if (roundDone) {
          const headId = group[0].id;
          exercises = exercises.map((e) =>
            e.id === headId
              ? { ...e, restEnabled: true, restStartedAt: Date.now() }
              : e
          );
        }
      } else if (justCompleted && ex) {
        // Standalone exercise: pressing the green tick (re)starts its rest timer.
        exercises = exercises.map((e) =>
          e.id === exId
            ? { ...e, restEnabled: true, restStartedAt: Date.now() }
            : e
        );
      }

      return { ...w, exercises };
    });
  }

  /** Remove a single set. Deleting a top-level set also drops its drop sets and
   *  renumbers the remaining top-level sets. */
  function deleteSet(exId: string, setId: string) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const sets = ex.sets.filter(
          (s) => s.id !== setId && s.parentSetId !== setId
        );
        let n = 0;
        const renumbered = sets.map((s) =>
          s.parentSetId ? s : { ...s, setNumber: ++n }
        );
        return { ...ex, sets: renumbered };
      }),
    }));
  }

  function changeSet(exId: string, setId: string, patch: Partial<WorkoutSet>) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, ...patch } : s
              ),
            }
          : ex
      ),
    }));
  }

  function removeExercise(exId: string) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.filter((ex) => ex.id !== exId),
    }));
  }

  async function addExercise(def: ExerciseDef, pairWithNext?: boolean) {
    setPickerOpen(false);
    const prev = await getLastPerformance(def.name);
    prevMaps.current.set(def.name, prev);

    // Superset grouping: join an open pairing, or open a new one if requested.
    let group = pendingSupersetRef.current;
    if (!group && pairWithNext) group = uid("ss");
    pendingSupersetRef.current = pairWithNext ? group : null;

    setWorkout((w) => ({
      ...w,
      exercises: [
        ...w.exercises,
        {
          id: uid("we"),
          exerciseName: def.name,
          slug: def.slug,
          notes: "",
          order: w.exercises.length + 1,
          restSeconds: 60,
          restEnabled: false,
          requiresBodyweight: def.requiresBodyweight ?? false,
          supersetGroup: group,
          sets: [
            {
              id: uid("set"),
              setNumber: 1,
              weightKg: null,
              reps: null,
              completed: false,
              previous: prev.get(1) ?? null,
            },
          ],
        },
      ],
    }));
  }

  // ── Finish / discard ──────────────────────────────────────────────────────
  /** Tapping "Finish": rate each worked exercise first, then save. With no
   *  completed sets there's nothing to rate, so save straight away. */
  function beginFinish() {
    if (saving) return;
    const hasCompleted = workout.exercises.some((ex) =>
      ex.sets.some((s) => s.completed)
    );
    if (hasCompleted) setRating(true);
    else finish();
  }

  function setToughness(exId: string, value: number | null) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((ex) =>
        ex.id === exId ? { ...ex, toughness: value } : ex
      ),
    }));
  }

  async function finish() {
    if (saving) return;
    setSaving(true);

    // All-time best weight per exercise (from finished history) for PR detection.
    const history = await getWorkouts();
    const bestBefore = new Map<string, number>();
    for (const w of history) {
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (s.completed && s.weightKg != null) {
            bestBefore.set(
              ex.exerciseName,
              Math.max(bestBefore.get(ex.exerciseName) ?? 0, s.weightKg)
            );
          }
        }
      }
    }

    const prs: WorkoutSummary["prs"] = [];
    for (const ex of workout.exercises) {
      let best: WorkoutSet | null = null;
      for (const s of ex.sets) {
        if (s.completed && s.weightKg != null && s.reps != null) {
          if (!best || (s.weightKg ?? 0) > (best.weightKg ?? 0)) best = s;
        }
      }
      if (best && (best.weightKg ?? 0) > (bestBefore.get(ex.exerciseName) ?? 0)) {
        prs.push({
          exerciseName: ex.exerciseName,
          weightKg: best.weightKg as number,
          reps: best.reps as number,
        });
      }
    }

    const animal = randomAnimal();
    const finishedAt = new Date().toISOString();
    const finished: Workout = {
      ...workout,
      finishedAt,
      animalName: animal.name,
      animalEmoji: animal.emoji,
      // Denormalize the primary muscle per exercise for fast volume-by-muscle
      // charts (here and in history/stats).
      exercises: workout.exercises.map((ex) => ({
        ...ex,
        bodyPart: primaryMuscleFor(ex),
      })),
    };
    await saveWorkout(finished);
    setBreakdown(volumeByMuscle(finished));

    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }

    setSummary({
      durationSeconds: workoutDurationSeconds(finished, Date.parse(finishedAt)),
      volumeKg: workoutVolume(finished),
      setsCompleted: completedSetCount(finished),
      prs,
      animal: { name: animal.name, emoji: animal.emoji },
    });
  }

  function discard() {
    if (!confirm("Discard this workout? Nothing will be saved.")) return;
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    router.replace("/");
  }

  if (summary) {
    return (
      <WorkoutSummaryView
        name={workout.name}
        summary={summary}
        breakdown={breakdown}
      />
    );
  }

  if (rating) {
    return (
      <ToughnessRating
        exercises={workout.exercises}
        saving={saving}
        onRate={setToughness}
        onBack={() => setRating(false)}
        onDone={finish}
      />
    );
  }

  const hasExercises = workout.exercises.length > 0;

  return (
    <div className="min-h-dvh pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-ink/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={discard}
            aria-label="Back"
            className="text-white transition-opacity hover:opacity-70"
          >
            <ChevronDownIcon size={22} />
          </button>
          <h1 className="font-semibold text-white">Log Workout</h1>
          <div className="flex items-center gap-3">
            <ClockIcon size={20} className="text-white" aria-hidden />
            <button
              onClick={beginFinish}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-1.5 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-60"
            >
              {saving ? "Saving…" : "Finish"}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <Stat label="Duration" value={formatDuration(durationSeconds)} accent />
          <Stat label="Volume" value={`${volume} kg`} />
          <Stat label="Sets" value={String(sets)} />
        </div>
      </header>

      {/* Body */}
      {!hasExercises ? (
        <div className="flex flex-col items-center px-6 pt-24 text-center">
          <DumbbellIcon size={48} className="text-faint" />
          <h2 className="mt-5 text-2xl font-bold text-white">Get started</h2>
          <p className="mt-2 text-muted">Add an exercise to start your workout</p>
          <button
            onClick={() => setPickerOpen(true)}
            className="mt-8 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-3.5 font-semibold text-white transition-colors hover:bg-accent-dim"
          >
            <PlusIcon size={18} />
            Add Exercise
          </button>
          <button
            onClick={discard}
            className="mt-3 w-full rounded-xl bg-card py-3.5 font-semibold text-danger transition-colors hover:bg-elevated"
          >
            Discard Workout
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {groupExercises(workout.exercises).map((group) =>
            group.length > 1 ? (
              <SupersetBlock
                key={group[0].id}
                exercises={group}
                bodyweightKg={bodyweightKg}
                onChange={patchExercise}
                onAddSet={addSet}
                onToggleSet={toggleSet}
                onChangeSet={changeSet}
                onAddDropSet={addDropSet}
                onDeleteSet={deleteSet}
                onRemove={removeExercise}
              />
            ) : (
              <ExerciseBlock
                key={group[0].id}
                exercise={group[0]}
                bodyweightKg={bodyweightKg}
                onChange={(patch) => patchExercise(group[0].id, patch)}
                onAddSet={() => addSet(group[0].id)}
                onToggleSet={(setId) => toggleSet(group[0].id, setId)}
                onChangeSet={(setId, patch) => changeSet(group[0].id, setId, patch)}
                onAddDropSet={(parentSetId) => addDropSet(group[0].id, parentSetId)}
                onDeleteSet={(setId) => deleteSet(group[0].id, setId)}
                onRemove={() => removeExercise(group[0].id)}
              />
            )
          )}

          <button
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-3.5 font-semibold text-ink transition-colors hover:bg-accent-dim"
          >
            <PlusIcon size={18} />
            Add Exercise
          </button>
          <button
            onClick={discard}
            className="w-full rounded-xl bg-card py-3.5 font-semibold text-danger transition-colors hover:bg-elevated"
          >
            Discard Workout
          </button>
        </div>
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        recentNames={recentNames}
        allowSuperset
      />
    </div>
  );
}

/** Collapse consecutive exercises sharing a superset group into sub-arrays. */
function groupExercises(exercises: WorkoutExercise[]): WorkoutExercise[][] {
  const groups: WorkoutExercise[][] = [];
  for (const ex of exercises) {
    const last = groups[groups.length - 1];
    if (ex.supersetGroup && last && last[0].supersetGroup === ex.supersetGroup) {
      last.push(ex);
    } else {
      groups.push([ex]);
    }
  }
  return groups;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-semibold ${accent ? "text-accent" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
