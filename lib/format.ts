import type { Workout } from "./types";

/**
 * Format elapsed seconds the way Hevy does:
 *  - under a minute  -> "Xs"      (e.g. "3s")
 *  - one min or more -> "Xm Ys"   (e.g. "12m 30s")
 *  - on an exact min  -> "Xm"      (e.g. "5m")
 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

/** Compact countdown for the rest timer: "1:05", "0:42". */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Total volume (kg) across completed sets only. */
export function workoutVolume(w: Workout): number {
  let total = 0;
  for (const ex of w.exercises) {
    for (const set of ex.sets) {
      if (set.completed && set.weightKg != null && set.reps != null) {
        total += set.weightKg * set.reps;
      }
    }
  }
  return Math.round(total);
}

/** Number of completed (ticked) sets. */
export function completedSetCount(w: Workout): number {
  let n = 0;
  for (const ex of w.exercises) {
    for (const set of ex.sets) if (set.completed) n += 1;
  }
  return n;
}

/** Seconds between start and (finish ?? now). */
export function workoutDurationSeconds(w: Workout, now = Date.now()): number {
  const start = new Date(w.startedAt).getTime();
  const end = w.finishedAt ? new Date(w.finishedAt).getTime() : now;
  return Math.max(0, Math.round((end - start) / 1000));
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Friendly date for history rows, e.g. "Mon, 23 Jun, 20:37". */
export function formatWorkoutDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

/** Cheap unique id for client-side objects. */
export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
