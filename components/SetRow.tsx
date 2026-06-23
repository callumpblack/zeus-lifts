"use client";

import type { WorkoutSet } from "@/lib/types";
import { CheckIcon } from "./icons";

interface Props {
  set: WorkoutSet;
  onChange: (patch: Partial<WorkoutSet>) => void;
  onToggle: () => void;
}

// Shared column template so header + rows line up exactly.
export const SET_GRID = "grid grid-cols-[26px_minmax(0,1fr)_58px_50px_36px] items-center gap-2";

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** One editable set line: number · previous · kg · reps · check. */
export default function SetRow({ set, onChange, onToggle }: Props) {
  const done = set.completed;
  const prev = set.previous;

  return (
    <div
      className={`${SET_GRID} rounded-lg px-1 py-1.5 transition-colors ${
        done ? "bg-success/25" : ""
      }`}
    >
      {/* Set number */}
      <div
        className={`text-center text-sm font-semibold ${
          done ? "text-white" : "text-muted"
        }`}
      >
        {set.setNumber}
      </div>

      {/* Previous */}
      <div className="truncate text-center text-sm text-faint">
        {prev ? `${prev.weightKg}kg x ${prev.reps}` : "–"}
      </div>

      {/* KG */}
      <input
        inputMode="decimal"
        value={set.weightKg ?? ""}
        onChange={(e) => onChange({ weightKg: parseNum(e.target.value) })}
        placeholder={prev ? String(prev.weightKg) : "0"}
        className={`h-9 w-full rounded-md text-center text-[15px] font-medium outline-none transition-colors ${
          done
            ? "bg-transparent text-white"
            : "bg-elevated text-white placeholder:text-faint focus:bg-hairline"
        }`}
        aria-label={`Set ${set.setNumber} weight in kg`}
      />

      {/* REPS */}
      <input
        inputMode="numeric"
        value={set.reps ?? ""}
        onChange={(e) => onChange({ reps: parseNum(e.target.value) })}
        placeholder={prev ? String(prev.reps) : "0"}
        className={`h-9 w-full rounded-md text-center text-[15px] font-medium outline-none transition-colors ${
          done
            ? "bg-transparent text-white"
            : "bg-elevated text-white placeholder:text-faint focus:bg-hairline"
        }`}
        aria-label={`Set ${set.setNumber} reps`}
      />

      {/* Complete checkbox */}
      <button
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`Mark set ${set.setNumber} complete`}
        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          done
            ? "bg-success text-ink"
            : "bg-elevated text-faint hover:bg-hairline"
        }`}
      >
        <CheckIcon size={16} />
      </button>
    </div>
  );
}
