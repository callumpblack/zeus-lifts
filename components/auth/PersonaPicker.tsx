"use client";

import { useState } from "react";
import type { Persona } from "@/lib/types";
import { getProfile, saveProfile, seedZeusRoutinesSafely } from "@/lib/db";

interface Props {
  /** Called once the persona is chosen and (for Zeus) routines are seeded. */
  onDone: () => void;
}

/**
 * First-login screen: pick Zeus (starts with the 4 routines) or Hera (blank).
 * The choice is saved to the user's profile; it determines starter content
 * only — every account stays fully isolated regardless of persona.
 */
export default function PersonaPicker({ onDone }: Props) {
  const [busy, setBusy] = useState<Persona | null>(null);
  const [error, setError] = useState("");

  async function choose(persona: Persona) {
    if (busy) return;
    setBusy(persona);
    setError("");
    try {
      const existing = await getProfile();
      await saveProfile({
        username: existing.username,
        persona,
        bodyweightKg: existing.bodyweightKg,
        updatedAt: new Date().toISOString(),
      });
      if (persona === "zeus") await seedZeusRoutinesSafely();
      onDone();
    } catch (err) {
      // Never strand the user on the spinner — surface the error and let them retry.
      setError(
        (err as Error)?.message || "Couldn’t finish setting up. Please try again."
      );
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-white">Who are you?</h1>
      <p className="mt-1 text-muted">This sets up your starting routines.</p>

      <div className="mt-8 grid w-full gap-3">
        <button
          onClick={() => choose("zeus")}
          disabled={busy !== null}
          className="rounded-2xl bg-card p-5 text-left ring-1 ring-hairline transition-colors hover:bg-elevated disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              ⚡
            </span>
            <div>
              <div className="font-bold text-white">
                {busy === "zeus" ? "Setting up…" : "Zeus"}
              </div>
              <div className="text-sm text-muted">
                Start with the 4 Zeus routines.
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => choose("hera")}
          disabled={busy !== null}
          className="rounded-2xl bg-card p-5 text-left ring-1 ring-hairline transition-colors hover:bg-elevated disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              🌙
            </span>
            <div>
              <div className="font-bold text-white">
                {busy === "hera" ? "Setting up…" : "Hera"}
              </div>
              <div className="text-sm text-muted">
                Start with a blank slate.
              </div>
            </div>
          </div>
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
