"use client";

import { Fragment } from "react";
import type { WorkoutExercise, WorkoutSet } from "@/lib/types";
import ExerciseBlock from "./ExerciseBlock";
import RestTimer from "./RestTimer";
import { LinkIcon } from "./icons";

interface Props {
  exercises: WorkoutExercise[]; // 2 or more grouped exercises
  bodyweightKg?: number | null;
  onChange: (exId: string, patch: Partial<WorkoutExercise>) => void;
  onAddSet: (exId: string) => void;
  onToggleSet: (exId: string, setId: string) => void;
  onChangeSet: (exId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  onAddDropSet: (exId: string, parentSetId: string) => void;
  onRemove: (exId: string) => void;
}

/**
 * Two (or more) exercises performed back-to-back as a superset. They share a
 * single rest timer (the head exercise owns its state); the logger auto-starts
 * it once a round is complete across the pair.
 */
export default function SupersetBlock({
  exercises,
  bodyweightKg,
  onChange,
  onAddSet,
  onToggleSet,
  onChangeSet,
  onAddDropSet,
  onRemove,
}: Props) {
  const head = exercises[0];

  return (
    <div className="rounded-2xl bg-card p-2 ring-1 ring-accent/40">
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent">
          <LinkIcon size={14} />
          SUPERSET
        </div>
        <RestTimer
          seconds={head.restSeconds || 60}
          enabled={head.restEnabled}
          onToggle={() => onChange(head.id, { restEnabled: !head.restEnabled })}
        />
      </div>

      <div className="mt-1 space-y-1">
        {exercises.map((ex, i) => (
          <Fragment key={ex.id}>
            {i > 0 && <div className="mx-3 border-t border-hairline" />}
            <ExerciseBlock
              exercise={ex}
              bodyweightKg={bodyweightKg}
              hideRestTimer
              onChange={(patch) => onChange(ex.id, patch)}
              onAddSet={() => onAddSet(ex.id)}
              onToggleSet={(setId) => onToggleSet(ex.id, setId)}
              onChangeSet={(setId, patch) => onChangeSet(ex.id, setId, patch)}
              onAddDropSet={(parentSetId) => onAddDropSet(ex.id, parentSetId)}
              onRemove={() => onRemove(ex.id)}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
