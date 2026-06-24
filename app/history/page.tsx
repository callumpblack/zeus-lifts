"use client";

import { useEffect, useState } from "react";
import type { Workout } from "@/lib/types";
import { getWorkouts } from "@/lib/db";
import {
  completedSetCount,
  formatDuration,
  formatWorkoutDate,
  workoutDurationSeconds,
  workoutVolume,
} from "@/lib/format";
import BottomNav from "@/components/BottomNav";
import ExerciseImage from "@/components/ExerciseImage";
import { ChevronDownIcon, HistoryIcon } from "@/components/icons";

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const all = await getWorkouts();
      setWorkouts(all.filter((w) => w.finishedAt));
    })();
  }, []);

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pb-2 pt-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          History
        </h1>
      </header>

      <div className="space-y-3 p-4">
        {workouts === null ? (
          <p className="py-10 text-center text-muted">Loading…</p>
        ) : workouts.length === 0 ? (
          <div className="flex flex-col items-center pt-20 text-center">
            <HistoryIcon size={44} className="text-faint" />
            <p className="mt-4 font-semibold text-white">No workouts yet</p>
            <p className="mt-1 text-sm text-muted">
              Finished workouts will show up here.
            </p>
          </div>
        ) : (
          workouts.map((w) => {
            const open = expanded === w.id;
            const completed = w.exercises
              .map((ex) => ({
                ...ex,
                done: ex.sets.filter((s) => s.completed),
              }))
              .filter((ex) => ex.done.length > 0);
            return (
              <div key={w.id} className="overflow-hidden rounded-2xl bg-card">
                <button
                  onClick={() => setExpanded(open ? null : w.id)}
                  className="w-full px-4 py-3.5 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      {w.animalEmoji ? `${w.animalEmoji} ` : ""}
                      {w.name || "Workout"}
                    </span>
                    <ChevronDownIcon
                      size={18}
                      className={`text-muted transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {formatWorkoutDate(w.startedAt)}
                  </div>
                  <div className="mt-2 flex gap-5 text-sm">
                    <Stat
                      label="Time"
                      value={formatDuration(workoutDurationSeconds(w))}
                    />
                    <Stat label="Volume" value={`${workoutVolume(w)} kg`} />
                    <Stat label="Sets" value={String(completedSetCount(w))} />
                  </div>
                </button>

                {open && (
                  <div className="border-t border-hairline px-4 py-3">
                    {completed.length === 0 ? (
                      <p className="text-sm text-muted">No completed sets.</p>
                    ) : (
                      <ul className="space-y-3">
                        {completed.map((ex) => (
                          <li key={ex.id} className="flex gap-3">
                            <ExerciseImage
                              slug={ex.slug}
                              alt={ex.exerciseName}
                              size={36}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-white">
                                {ex.exerciseName}
                              </div>
                              <div className="mt-0.5 text-xs text-muted">
                                {ex.done
                                  .map((s) => `${s.weightKg ?? 0}kg × ${s.reps ?? 0}`)
                                  .join("  ·  ")}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-muted">
      {label}{" "}
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}
