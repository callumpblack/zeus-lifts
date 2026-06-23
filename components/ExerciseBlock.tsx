"use client";

import { useRef, useState } from "react";
import type { WorkoutExercise, WorkoutSet } from "@/lib/types";
import ExerciseImage from "./ExerciseImage";
import RestTimer from "./RestTimer";
import SetRow, { SET_GRID } from "./SetRow";
import { MoreVerticalIcon, PlusIcon } from "./icons";

interface Props {
  exercise: WorkoutExercise;
  onChange: (patch: Partial<WorkoutExercise>) => void;
  onAddSet: () => void;
  onToggleSet: (setId: string) => void;
  onChangeSet: (setId: string, patch: Partial<WorkoutSet>) => void;
  onRemove: () => void;
}

/** A single exercise card inside the active workout. */
export default function ExerciseBlock({
  exercise,
  onChange,
  onAddSet,
  onToggleSet,
  onChangeSet,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="rounded-2xl bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ExerciseImage slug={exercise.slug} alt={exercise.exerciseName} size={40} />
        <h3 className="min-w-0 flex-1 truncate font-semibold text-accent">
          {exercise.exerciseName}
        </h3>
        <div className="relative">
          <button
            aria-label="Exercise options"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1 text-muted transition-colors hover:text-white"
          >
            <MoreVerticalIcon size={20} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-hairline bg-elevated shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    notesRef.current?.focus();
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-white hover:bg-hairline"
                >
                  Add a note
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRemove();
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-danger hover:bg-hairline"
                >
                  Remove exercise
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      <textarea
        ref={notesRef}
        value={exercise.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Add notes here..."
        rows={1}
        className="mt-2 w-full resize-none bg-transparent text-sm text-muted placeholder:text-faint focus:text-white focus:outline-none"
      />

      {/* Rest timer */}
      <div className="mt-1">
        <RestTimer
          seconds={exercise.restSeconds || 60}
          enabled={exercise.restEnabled}
          onToggle={() => onChange({ restEnabled: !exercise.restEnabled })}
        />
      </div>

      {/* Column headers */}
      <div className={`${SET_GRID} mt-3 px-1 text-[11px] font-semibold tracking-wide text-faint`}>
        <div className="text-center">SET</div>
        <div className="text-center">PREVIOUS</div>
        <div className="text-center">KG</div>
        <div className="text-center">REPS</div>
        <div className="text-center">✓</div>
      </div>

      {/* Set rows */}
      <div className="mt-1 space-y-0.5">
        {exercise.sets.map((s) => (
          <SetRow
            key={s.id}
            set={s}
            onToggle={() => onToggleSet(s.id)}
            onChange={(patch) => onChangeSet(s.id, patch)}
          />
        ))}
      </div>

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-elevated py-2.5 text-sm font-medium text-white transition-colors hover:bg-hairline"
      >
        <PlusIcon size={16} />
        Add Set
      </button>
    </div>
  );
}
