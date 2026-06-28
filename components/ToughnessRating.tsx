"use client";

import { useMemo } from "react";
import type { WorkoutExercise } from "@/lib/types";
import ExerciseImage from "./ExerciseImage";
import { ChevronLeftIcon } from "./icons";

interface Props {
  exercises: WorkoutExercise[];
  saving: boolean;
  onRate: (exId: string, value: number | null) => void;
  onBack: () => void;
  onDone: () => void;
}

const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

/** Green (easy) → amber → red (brutal) tint for a toughness value 1–10. */
function toughnessColor(v: number): string {
  if (v <= 3) return "#22C55E";
  if (v <= 6) return "#EAB308";
  if (v <= 8) return "#F97316";
  return "#FF453A";
}

/**
 * End-of-session step: rate how tough each worked exercise felt, 1 (easy) to
 * 10 (brutal). Ratings are optional — "Finish" saves whatever's been set.
 */
export default function ToughnessRating({
  exercises,
  saving,
  onRate,
  onBack,
  onDone,
}: Props) {
  // Only ask about exercises that actually had a completed set.
  const worked = useMemo(
    () => exercises.filter((ex) => ex.sets.some((s) => s.completed)),
    [exercises]
  );

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-20 border-b border-hairline bg-ink/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            aria-label="Back to workout"
            className="text-white transition-opacity hover:opacity-70"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <h1 className="font-semibold text-white">Rate Toughness</h1>
          <button
            onClick={onDone}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-1.5 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-60"
          >
            {saving ? "Saving…" : "Finish"}
          </button>
        </div>
      </header>

      <p className="px-4 pt-4 text-sm text-muted">
        How hard did each exercise feel? 1 = easy, 10 = brutal.
      </p>

      <div className="space-y-3 p-4">
        {worked.map((ex) => (
          <div key={ex.id} className="rounded-2xl bg-card p-4">
            <div className="flex items-center gap-3">
              <ExerciseImage
                name={ex.exerciseName}
                slug={ex.slug}
                alt={ex.exerciseName}
                size={36}
                link
              />
              <h3 className="min-w-0 flex-1 truncate font-semibold text-white">
                {ex.exerciseName}
              </h3>
              <span className="text-sm font-bold tabular-nums text-muted">
                {ex.toughness != null ? `${ex.toughness}/10` : "–"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-10 gap-1.5">
              {SCALE.map((v) => {
                const selected = ex.toughness === v;
                return (
                  <button
                    key={v}
                    onClick={() => onRate(ex.id, selected ? null : v)}
                    aria-label={`${ex.exerciseName} toughness ${v} of 10`}
                    aria-pressed={selected}
                    className={`flex h-9 items-center justify-center rounded-md text-sm font-semibold transition-colors ${
                      selected ? "text-ink" : "bg-elevated text-muted hover:bg-hairline"
                    }`}
                    style={selected ? { backgroundColor: toughnessColor(v) } : undefined}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
