"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Routine, RoutineMode } from "@/lib/types";
import { deleteRoutine } from "@/lib/db";
import ModeDialog from "./ModeDialog";
import { MoreVerticalIcon } from "./icons";

interface Props {
  routine: Routine;
  onChanged?: () => void;
}

/** A saved-routine card: name, 3-exercise preview, and Start Routine. */
export default function RoutineCard({ routine, onChanged }: Props) {
  const router = useRouter();
  const [askMode, setAskMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const preview = routine.exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map((e) => e.exerciseName)
    .join(", ");

  function start(mode: RoutineMode) {
    setAskMode(false);
    router.push(`/workout/routine/${routine.id}?mode=${mode}`);
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`Delete "${routine.name}"? This cannot be undone.`)) return;
    await deleteRoutine(routine.id);
    onChanged?.();
  }

  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-white">{routine.name}</h3>
        <div className="relative">
          <button
            aria-label="Routine options"
            onClick={() => setMenuOpen((v) => !v)}
            className="-mr-1 -mt-1 rounded-lg p-1 text-muted transition-colors hover:text-white"
          >
            <MoreVerticalIcon size={20} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-hairline bg-elevated shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/routines/new?edit=${routine.id}`);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-white hover:bg-hairline"
                >
                  Edit routine
                </button>
                <button
                  onClick={handleDelete}
                  className="block w-full px-4 py-3 text-left text-sm text-danger hover:bg-hairline"
                >
                  Delete routine
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-1 line-clamp-2 text-sm text-muted">{preview}</p>

      <button
        onClick={() => setAskMode(true)}
        className="mt-3 w-full rounded-xl bg-accent py-3 font-semibold text-ink transition-colors hover:bg-accent-dim active:bg-accent-dim"
      >
        Start Routine
      </button>

      <ModeDialog
        routine={routine}
        open={askMode}
        onClose={() => setAskMode(false)}
        onSelect={start}
      />
    </div>
  );
}
