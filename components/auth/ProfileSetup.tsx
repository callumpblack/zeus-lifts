"use client";

import { useEffect, useState } from "react";
import type { Persona } from "@/lib/types";
import { getProfile } from "@/lib/db";
import MacroOnboarding from "@/components/nutrition/MacroOnboarding";

const PERSONA_LABEL: Record<Persona, string> = { zeus: "Zeus", hera: "Hera" };

/**
 * Second step of first login (after the Zeus/Hera pick): fill in the single
 * shared profile that powers BOTH the lifting and nutrition sections. Reuses
 * the nutrition macro calculator; on save it also syncs bodyweight to the
 * lifting profile (handled inside MacroOnboarding), so the two stay consistent.
 */
export default function ProfileSetup({ onDone }: { onDone: () => void }) {
  const [persona, setPersona] = useState<Persona | null>(null);

  useEffect(() => {
    getProfile().then((p) => setPersona(p.persona));
  }, []);

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
        <MacroOnboarding
          defaultLabel={persona ? PERSONA_LABEL[persona] : ""}
          onSaved={() => onDone()}
        />
      </div>
    </main>
  );
}
