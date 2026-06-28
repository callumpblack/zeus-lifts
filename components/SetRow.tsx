"use client";

import { useState } from "react";
import type { WorkoutSet } from "@/lib/types";
import { CheckIcon } from "./icons";

interface Props {
  set: WorkoutSet;
  onChange: (patch: Partial<WorkoutSet>) => void;
  onToggle: () => void;
  /** Assisted exercise: input is assistance, lifted = bodyweight − assistance. */
  assisted?: boolean;
  bodyweightKg?: number | null;
  /** This row is a drop set hanging off a parent set. */
  isDropSet?: boolean;
  /** Tap the set number to add a drop set under this (top-level) row. */
  onAddDropSet?: () => void;
  /** Delete this set (and any drop sets) from the exercise. */
  onDelete?: () => void;
}

// Shared column template so header + rows line up exactly.
export const SET_GRID = "grid grid-cols-[26px_minmax(0,1fr)_58px_50px_36px] items-center gap-2";

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** One editable set line: number · previous/lifted · kg/assist · reps · check. */
export default function SetRow({
  set,
  onChange,
  onToggle,
  assisted = false,
  bodyweightKg = null,
  isDropSet = false,
  onAddDropSet,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const done = set.completed;
  const prev = set.previous;

  // For assisted exercises, the editable load is the assistance weight; the
  // actual lifted weight (stored in weightKg, drives volume) is bodyweight − assist.
  const lifted =
    assisted && bodyweightKg != null && set.assistanceKg != null
      ? Math.max(0, bodyweightKg - set.assistanceKg)
      : null;

  function onLoadChange(raw: string) {
    if (!assisted) {
      onChange({ weightKg: parseNum(raw) });
      return;
    }
    const assist = parseNum(raw);
    const next = bodyweightKg != null && assist != null
      ? Math.max(0, bodyweightKg - assist)
      : null;
    onChange({ assistanceKg: assist, weightKg: next });
  }

  const loadValue = assisted ? (set.assistanceKg ?? "") : (set.weightKg ?? "");

  const inputClass = `h-9 w-full rounded-md text-center text-[15px] font-medium outline-none transition-colors ${
    done
      ? "bg-transparent text-white"
      : "bg-elevated text-white placeholder:text-faint focus:bg-hairline"
  }`;

  return (
    <div
      className={`${SET_GRID} rounded-lg px-1 py-1.5 transition-colors ${
        done ? "bg-success/25" : isDropSet ? "bg-elevated/40" : ""
      }`}
    >
      {/* Set number — tap to open a menu (add drop set / delete). Drop sets
          show a branch glyph and only offer delete. */}
      <div className="relative mx-auto">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`Set ${set.setNumber} options`}
          aria-haspopup="menu"
          className={`flex h-6 w-6 items-center justify-center rounded-md text-sm font-semibold transition-colors hover:bg-elevated ${
            isDropSet ? "text-faint" : done ? "text-white" : "text-muted"
          }`}
        >
          {isDropSet ? "↳" : set.setNumber}
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 top-7 z-20 w-40 overflow-hidden rounded-xl border border-hairline bg-elevated shadow-xl">
              {!isDropSet && onAddDropSet && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onAddDropSet();
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-white hover:bg-hairline"
                >
                  Add drop set
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete?.();
                }}
                className="block w-full px-4 py-3 text-left text-sm text-danger hover:bg-hairline"
              >
                {isDropSet ? "Delete drop set" : "Delete set"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Previous (normal) or computed lifted weight (assisted). */}
      <div className="truncate text-center text-sm text-faint">
        {assisted
          ? lifted != null
            ? `${lifted}kg`
            : "–"
          : prev
            ? `${prev.weightKg}kg x ${prev.reps}`
            : "–"}
      </div>

      {/* KG (normal) or ASSIST (assisted). */}
      <input
        inputMode="decimal"
        value={loadValue}
        onChange={(e) => onLoadChange(e.target.value)}
        placeholder={assisted ? "0" : prev ? String(prev.weightKg) : "0"}
        className={inputClass}
        aria-label={
          assisted
            ? `Set ${set.setNumber} assistance in kg`
            : `Set ${set.setNumber} weight in kg`
        }
      />

      {/* REPS */}
      <input
        inputMode="numeric"
        value={set.reps ?? ""}
        onChange={(e) => onChange({ reps: parseNum(e.target.value) })}
        placeholder={prev ? String(prev.reps) : "0"}
        className={inputClass}
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
