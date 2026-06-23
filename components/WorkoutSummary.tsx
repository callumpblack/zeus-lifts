"use client";

import { useRouter } from "next/navigation";
import type { WorkoutSummary } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { CheckIcon, TrendingIcon } from "./icons";

interface Props {
  name: string;
  summary: WorkoutSummary;
}

/** Confirmation screen shown after a workout is saved. */
export default function WorkoutSummaryView({ name, summary }: Props) {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col items-center px-6 pt-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
        <CheckIcon size={34} />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-white">Workout Complete</h1>
      <p className="mt-1 text-muted">{name || "Workout"} saved</p>

      <div className="mt-8 grid w-full grid-cols-3 gap-3">
        <Tile label="Duration" value={formatDuration(summary.durationSeconds)} accent />
        <Tile label="Volume" value={`${summary.volumeKg} kg`} />
        <Tile label="Sets" value={String(summary.setsCompleted)} />
      </div>

      {summary.prs.length > 0 && (
        <div className="mt-6 w-full rounded-2xl bg-card p-4 text-left">
          <div className="flex items-center gap-2 text-accent">
            <TrendingIcon size={18} />
            <h2 className="font-semibold">
              {summary.prs.length} Personal Record
              {summary.prs.length > 1 ? "s" : ""}
            </h2>
          </div>
          <ul className="mt-3 space-y-2">
            {summary.prs.map((pr) => (
              <li
                key={pr.exerciseName}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-white">{pr.exerciseName}</span>
                <span className="font-medium text-muted">
                  {pr.weightKg}kg × {pr.reps}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => router.replace("/")}
        className="mt-10 w-full rounded-xl bg-accent py-3.5 font-semibold text-ink transition-colors hover:bg-accent-dim"
      >
        Done
      </button>
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-lg font-bold ${accent ? "text-accent" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
