"use client";

import { useEffect, useState } from "react";
import type { Persona } from "@/lib/types";
import { getProfile } from "@/lib/db";
import { PERSONA_DEFAULTS } from "@/lib/nutrition/persona-defaults";
import MacroOnboarding from "@/components/nutrition/MacroOnboarding";

/**
 * Second step of first login (after the Zeus/Hera pick): fill in the single
 * shared profile that powers BOTH the lifting and nutrition sections. Reuses
 * the nutrition macro calculator, pre-filled with the persona's confirmed
 * profile data; on save it also syncs bodyweight to the lifting profile
 * (handled inside MacroOnboarding), so the two stay consistent.
 */
export default function ProfileSetup({ onDone }: { onDone: () => void }) {
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    getProfile().then((p) => setPersona(p.persona));
  }, []);

  const defaults = persona ? PERSONA_DEFAULTS[persona] : undefined;

  return (
    <main className="min-h-dvh pb-10">
      <header className="px-4 pb-2 pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Set up your <span className="text-accent">profile</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          A few details to personalise your targets — this one profile powers
          both your lifting and nutrition tracking.
        </p>
      </header>
      <div className="p-4">
        {/* Wait for the persona so the form mounts already pre-filled. */}
        {persona === null ? (
          <p className="py-10 text-center text-muted">Loading…</p>
        ) : (
          <MacroOnboarding
            defaultLabel={defaults?.label ?? ""}
            defaults={defaults}
            onSaved={() => onDone()}
          />
        )}
      </div>
    </main>
  );
}
