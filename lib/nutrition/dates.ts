// Date helpers for the nutrition tracker. The app stores days as ISO date
// strings (yyyy-mm-dd) in the viewer's local timezone, so "today" always
// matches the wall-clock day the user sees.

/** Local yyyy-mm-dd for a Date (defaults to now). */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a yyyy-mm-dd string to a local Date at midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Today's local ISO date. */
export function todayISO(): string {
  return toISODate();
}

/** Add (or subtract) whole days to an ISO date, returning a new ISO date. */
export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days between two ISO dates (b − a). Negative if b is before a. */
export function daysBetween(a: string, b: string): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** The N most recent ISO dates ending today (oldest first). */
export function lastNDays(n: number, endISO: string = todayISO()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(endISO, -(n - 1 - i)));
}

export function isFutureDate(iso: string): boolean {
  return daysBetween(todayISO(), iso) > 0;
}

const SHORT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const LONG = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

/** "Mon, 23 Jun". */
export function formatShortDate(iso: string): string {
  return SHORT.format(fromISODate(iso));
}

/** "Monday, 23 June 2026". */
export function formatLongDate(iso: string): string {
  return LONG.format(fromISODate(iso));
}

/** Single-letter-ish weekday for chart axes, e.g. "Mon". */
export function weekdayLabel(iso: string): string {
  return WEEKDAY.format(fromISODate(iso));
}

/** Friendly relative label for headers: Today / Yesterday / short date. */
export function relativeDayLabel(iso: string): string {
  const delta = daysBetween(todayISO(), iso);
  if (delta === 0) return "Today";
  if (delta === -1) return "Yesterday";
  if (delta === 1) return "Tomorrow";
  return formatShortDate(iso);
}
