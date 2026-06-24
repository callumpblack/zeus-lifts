"use client";

import { useEffect, useState } from "react";
import type { Persona, Profile } from "@/lib/types";
import { getProfile, saveProfile, signOut } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { formatWorkoutDate } from "@/lib/format";
import BottomNav from "@/components/BottomNav";
import { UserIcon } from "@/components/icons";

const PERSONA_LABEL: Record<Persona, string> = {
  zeus: "⚡ Zeus",
  hera: "🌙 Hera",
};

export default function ProfilePage() {
  const [bodyweight, setBodyweight] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setBodyweight(p.bodyweightKg != null ? String(p.bodyweightKg) : "");
      setPersona(p.persona);
      setUpdatedAt(p.updatedAt);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setStatus("saving");
    const n = Number(bodyweight);
    const profile: Profile = {
      persona,
      bodyweightKg: bodyweight.trim() === "" || !Number.isFinite(n) ? null : n,
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(profile);
    setUpdatedAt(profile.updatedAt);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pb-2 pt-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Profile
        </h1>
        {persona && (
          <p className="mt-1 text-sm font-medium text-accent">
            {PERSONA_LABEL[persona]}
          </p>
        )}
      </header>

      <div className="p-4">
        <div className="rounded-2xl bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-accent">
              <UserIcon size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-white">Bodyweight</h2>
              <p className="text-xs text-muted">
                Used for assisted exercises (lifted = bodyweight − assistance).
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-xl bg-elevated px-3 py-2.5">
            <input
              inputMode="decimal"
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
              placeholder={loading ? "…" : "e.g. 80"}
              disabled={loading}
              className="w-full bg-transparent text-[15px] text-white placeholder:text-faint focus:outline-none"
              aria-label="Bodyweight in kilograms"
            />
            <span className="shrink-0 text-sm font-medium text-muted">kg</span>
          </label>

          <button
            onClick={save}
            disabled={loading || status === "saving"}
            className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-60"
          >
            {status === "saving"
              ? "Saving…"
              : status === "saved"
                ? "Saved ✓"
                : "Save"}
          </button>

          {updatedAt && (
            <p className="mt-3 text-center text-xs text-faint">
              Last updated {formatWorkoutDate(updatedAt)}
            </p>
          )}
        </div>

        {isSupabaseConfigured && (
          <button
            onClick={() => signOut().then(() => window.location.reload())}
            className="mt-4 w-full rounded-xl bg-card py-3.5 font-semibold text-danger transition-colors hover:bg-elevated"
          >
            Sign out
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
