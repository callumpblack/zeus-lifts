"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ExerciseMode, Routine, RoutineExercise } from "@/lib/types";
import { createRoutine, getRoutineById } from "@/lib/db";
import { uid } from "@/lib/format";
import type { ExerciseDef } from "@/lib/types";
import ExercisePicker from "@/components/ExercisePicker";
import ExerciseImage from "@/components/ExerciseImage";
import { ChevronLeftIcon, PlusIcon, TrashIcon } from "@/components/icons";

// Working copy of an exercise being edited within a routine.
interface DraftExercise extends RoutineExercise {}

function RoutineEditorInner() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("edit");

  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [routineId, setRoutineId] = useState<string>(() => uid("rt"));
  const [createdAt, setCreatedAt] = useState<string>(() =>
    new Date().toISOString()
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing routine when editing.
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const r = await getRoutineById(editId);
      if (!r) return;
      setRoutineId(r.id);
      setCreatedAt(r.createdAt);
      setName(r.name);
      setExercises(r.exercises.slice().sort((a, b) => a.order - b.order));
    })();
  }, [editId]);

  function addExercise(def: ExerciseDef) {
    setPickerOpen(false);
    setExercises((prev) => [
      ...prev,
      {
        id: uid("rex"),
        exerciseName: def.name,
        slug: def.slug,
        primaryMuscle: def.primaryMuscle,
        equipment: def.equipment,
        sets: 3,
        reps: "8-12",
        restSeconds: 90,
        order: prev.length + 1,
        mode: "both",
      },
    ]);
  }

  function patch(id: string, p: Partial<DraftExercise>) {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...p } : e))
    );
  }

  function remove(id: string) {
    setExercises((prev) =>
      prev
        .filter((e) => e.id !== id)
        .map((e, i) => ({ ...e, order: i + 1 }))
    );
  }

  async function save() {
    if (saving) return;
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);
    const routine: Routine = {
      id: routineId,
      name: name.trim(),
      createdAt,
      exercises: exercises.map((e, i) => ({ ...e, order: i + 1 })),
    };
    await createRoutine(routine);
    router.replace("/");
  }

  const canSave = name.trim().length > 0 && exercises.length > 0;

  return (
    <main className="min-h-dvh pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-hairline bg-ink/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => router.back()}
          className="flex items-center text-accent transition-opacity hover:opacity-80"
        >
          <ChevronLeftIcon size={22} />
          <span className="font-medium">Cancel</span>
        </button>
        <h1 className="font-semibold text-white">
          {editId ? "Edit Routine" : "New Routine"}
        </h1>
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="font-semibold text-accent transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="space-y-4 p-4">
        {/* Name */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Routine name"
          className="w-full rounded-xl bg-card px-4 py-3 text-lg font-semibold text-white placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {/* Exercises */}
        {exercises.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No exercises yet. Add your first one below.
          </p>
        ) : (
          <div className="space-y-3">
            {exercises.map((ex) => (
              <div key={ex.id} className="rounded-2xl bg-card p-4">
                <div className="flex items-center gap-3">
                  <ExerciseImage slug={ex.slug} alt={ex.exerciseName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-accent">
                      {ex.exerciseName}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {ex.primaryMuscle}
                    </div>
                  </div>
                  <button
                    aria-label="Remove exercise"
                    onClick={() => remove(ex.id)}
                    className="p-1 text-muted transition-colors hover:text-danger"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Field label="Sets">
                    <input
                      inputMode="numeric"
                      value={ex.sets}
                      onChange={(e) =>
                        patch(ex.id, {
                          sets: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-full rounded-lg bg-elevated px-2 py-2 text-center text-white focus:outline-none"
                    />
                  </Field>
                  <Field label="Reps">
                    <input
                      value={ex.reps}
                      onChange={(e) => patch(ex.id, { reps: e.target.value })}
                      placeholder="8-12"
                      className="w-full rounded-lg bg-elevated px-2 py-2 text-center text-white placeholder:text-faint focus:outline-none"
                    />
                  </Field>
                  <Field label="Rest (s)">
                    <input
                      inputMode="numeric"
                      value={ex.restSeconds}
                      onChange={(e) =>
                        patch(ex.id, {
                          restSeconds: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full rounded-lg bg-elevated px-2 py-2 text-center text-white focus:outline-none"
                    />
                  </Field>
                </div>

                {/* Solo-only toggle */}
                <button
                  onClick={() =>
                    patch(ex.id, {
                      mode: (ex.mode === "solo" ? "both" : "solo") as ExerciseMode,
                    })
                  }
                  className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    ex.mode === "solo"
                      ? "bg-accent text-white"
                      : "bg-elevated text-muted"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      ex.mode === "solo" ? "bg-white" : "bg-faint"
                    }`}
                  />
                  Solo-only extra
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add exercise */}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-3.5 font-semibold text-white transition-colors hover:bg-accent-dim"
        >
          <PlusIcon size={18} />
          Add Exercise
        </button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
      />
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-center text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function RoutineEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <RoutineEditorInner />
    </Suspense>
  );
}
