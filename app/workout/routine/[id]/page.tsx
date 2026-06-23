"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { RoutineMode, Workout, WorkoutExercise } from "@/lib/types";
import { exercisesForMode, getRoutineById } from "@/lib/db";
import { targetNote } from "@/lib/seed-routines";
import { uid } from "@/lib/format";
import WorkoutLogger from "@/components/WorkoutLogger";

function buildExercises(
  routineExercises: ReturnType<typeof exercisesForMode>
): WorkoutExercise[] {
  return routineExercises.map((re, i) => ({
    id: uid("we"),
    exerciseName: re.exerciseName,
    slug: re.slug,
    notes: targetNote(re.sets, re.reps),
    order: i + 1,
    restSeconds: re.restSeconds || 60,
    restEnabled: false,
    sets: Array.from({ length: re.sets }, (_, s) => ({
      id: uid("set"),
      setNumber: s + 1,
      weightKg: null,
      reps: null,
      completed: false,
      previous: null,
    })),
  }));
}

function RoutineWorkoutInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const mode = (search.get("mode") as RoutineMode) || "with_friend";

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "missing" }
    | { status: "ready"; name: string; exercises: WorkoutExercise[] }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      const routine = await getRoutineById(params.id);
      if (!active) return;
      if (!routine) {
        setState({ status: "missing" });
        return;
      }
      setState({
        status: "ready",
        name: routine.name,
        exercises: buildExercises(exercisesForMode(routine, mode)),
      });
    })();
    return () => {
      active = false;
    };
  }, [params.id, mode]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Loading routine…
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted">That routine could not be found.</p>
        <button
          onClick={() => router.replace("/")}
          className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <WorkoutLogger
      routineId={params.id}
      routineName={state.name}
      initialExercises={state.exercises}
    />
  );
}

export default function RoutineWorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <RoutineWorkoutInner />
    </Suspense>
  );
}
