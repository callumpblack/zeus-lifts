"use client";

import { useEffect, useMemo, useState } from "react";
import type { Workout } from "@/lib/types";
import { getWorkouts } from "@/lib/db";
import { muscleGroupTotals, type Metric } from "@/lib/muscle-groups";
import BottomNav from "@/components/BottomNav";
import ModuleToggle from "@/components/nutrition/ModuleToggle";
import { BarChartIcon } from "@/components/icons";

export default function StatsPage() {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [metric, setMetric] = useState<Metric>("sets");
  const [routine, setRoutine] = useState<string>("All routines");

  useEffect(() => {
    (async () => {
      const all = await getWorkouts();
      setWorkouts(all.filter((w) => w.finishedAt));
    })();
  }, []);

  // Distinct routine names seen in history, for the filter dropdown.
  const routineNames = useMemo(() => {
    const names = new Set<string>();
    for (const w of workouts ?? []) names.add(w.name || "Workout");
    return ["All routines", ...Array.from(names).sort()];
  }, [workouts]);

  const filtered = useMemo(() => {
    const list = workouts ?? [];
    return routine === "All routines"
      ? list
      : list.filter((w) => (w.name || "Workout") === routine);
  }, [workouts, routine]);

  const totals = useMemo(
    () => muscleGroupTotals(filtered, metric),
    [filtered, metric]
  );
  const max = Math.max(1, ...totals.map((t) => t.value));
  const unit = metric === "sets" ? "sets" : "kg";

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pb-2 pt-5">
        <ModuleToggle />
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
          Stats
        </h1>
      </header>

      <div className="space-y-4 p-4">
        {workouts === null ? (
          <p className="py-10 text-center text-muted">Loading…</p>
        ) : workouts.length === 0 ? (
          <div className="flex flex-col items-center pt-20 text-center">
            <BarChartIcon size={44} className="text-faint" />
            <p className="mt-4 font-semibold text-white">No data yet</p>
            <p className="mt-1 text-sm text-muted">
              Finish a workout and your muscle-group breakdown shows up here.
            </p>
          </div>
        ) : (
          <>
            {/* Routine filter */}
            {routineNames.length > 2 && (
              <select
                value={routine}
                onChange={(e) => setRoutine(e.target.value)}
                className="w-full rounded-xl bg-card px-4 py-3 text-sm font-medium text-white outline-none"
              >
                {routineNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}

            {/* Sets / Volume toggle */}
            <div className="flex rounded-xl bg-card p-1">
              {(["sets", "volume"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                    metric === m
                      ? "bg-accent text-ink"
                      : "text-muted hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Horizontal bar chart */}
            <section className="rounded-2xl bg-card p-4">
              <h2 className="font-semibold text-white">By muscle group</h2>
              <p className="mt-0.5 text-xs text-muted">
                {metric === "sets"
                  ? "Completed sets"
                  : "Total volume lifted"}{" "}
                across {filtered.length} session
                {filtered.length === 1 ? "" : "s"}
              </p>

              {totals.length === 0 ? (
                <p className="py-8 text-center text-sm text-faint">
                  No completed sets to chart.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {totals.map((t) => (
                    <div key={t.group}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="font-medium text-white">{t.group}</span>
                        <span className="tabular-nums text-muted">
                          {t.value.toLocaleString()} {unit}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-elevated">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${(t.value / max) * 100}%`,
                            backgroundColor: t.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
