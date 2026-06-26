"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NutritionProfile } from "@/lib/nutrition/types";
import { ACTIVITY_LEVELS } from "@/lib/nutrition/types";
import { ageFromDOB, GOAL_LABEL } from "@/lib/nutrition/macros";
import { deleteProfile, getProfiles, saveProfile } from "@/lib/nutrition/db";
import {
  getActiveProfileId,
  setActiveProfileId,
  useActiveProfileId,
} from "@/lib/nutrition/active-profile";
import { todayISO } from "@/lib/nutrition/dates";
import NutritionNav from "@/components/nutrition/NutritionNav";
import NutritionHeader from "@/components/nutrition/NutritionHeader";
import MacroOnboarding from "@/components/nutrition/MacroOnboarding";
import BodyWeightCard from "@/components/nutrition/BodyWeightCard";
import { PlusIcon, TrashIcon } from "@/components/icons";

type Mode = "view" | "edit" | "new";

export default function SettingsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<NutritionProfile[] | null>(null);
  const [activeId, setActiveId] = useActiveProfileId();
  const [mode, setMode] = useState<Mode>("view");

  const reload = useCallback(async () => {
    const all = await getProfiles();
    setProfiles(all);
    if (all.length === 0) router.replace("/nutrition");
    return all;
  }, [router]);

  useEffect(() => {
    reload();
  }, [reload]);

  const profile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeId) ?? profiles[0];
  }, [profiles, activeId]);

  if (!profiles || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </main>
    );
  }

  async function handleDelete() {
    if (!profile) return;
    const ok = window.confirm(
      `Delete the "${profile.label}" profile and all its logs? This can’t be undone.`
    );
    if (!ok) return;
    await deleteProfile(profile.id);
    const remaining = await getProfiles();
    setProfiles(remaining);
    if (remaining.length === 0) {
      setActiveProfileId(null);
      router.replace("/nutrition");
    } else {
      setActiveId(remaining[0].id);
    }
  }

  // Edit / new use the same calculator component.
  if (mode === "edit" || mode === "new") {
    return (
      <main className="min-h-dvh pb-24">
        <header className="px-4 pb-2 pt-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {mode === "new" ? "New profile" : `Edit ${profile.label}`}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "new"
              ? "Add another household profile (e.g. Hera)."
              : "Update your stats to recalculate your macro targets."}
          </p>
        </header>
        <div className="p-4">
          <MacroOnboarding
            existing={mode === "edit" ? profile : undefined}
            onSaved={async () => {
              await reload();
              setMode("view");
            }}
            onCancel={() => setMode("view")}
          />
        </div>
        <NutritionNav />
      </main>
    );
  }

  const activityLabel =
    ACTIVITY_LEVELS.find((a) => a.value === profile.activityLevel)?.label ??
    "Custom";

  return (
    <main className="min-h-dvh pb-24">
      <NutritionHeader
        title="Settings"
        profiles={profiles}
        activeId={profile.id}
        onProfileChange={setActiveId}
      />

      <div className="space-y-4 p-4">
        {/* Targets summary */}
        <section className="rounded-2xl bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">{profile.label}</h2>
            <button
              onClick={() => setMode("edit")}
              className="rounded-lg bg-elevated px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-hairline"
            >
              Edit & recalculate
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Tile big label="kcal" value={profile.targets.calories} />
            <Tile label="Protein" value={`${profile.targets.protein_g}g`} />
            <Tile label="Fat" value={`${profile.targets.fat_g}g`} />
            <Tile label="Carbs" value={`${profile.targets.carbs_g}g`} />
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            <Row k="Sex" v={cap(profile.sex)} />
            <Row k="Age" v={`${ageFromDOB(profile.dateOfBirth)} yrs`} />
            <Row k="Weight" v={`${profile.weightKg} kg`} />
            <Row k="Height" v={`${profile.heightCm} cm`} />
            <Row k="Activity" v={activityLabel} />
            <Row k="Goal" v={GOAL_LABEL[profile.goal]} />
            {profile.targetWeightKg != null && (
              <Row k="Target weight" v={`${profile.targetWeightKg} kg`} />
            )}
          </dl>
        </section>

        {/* Training-day calorie cycling */}
        <CalorieCyclingCard profile={profile} onSaved={reload} />

        {/* Water target */}
        <WaterTargetCard profile={profile} onSaved={reload} />

        {/* Bodyweight logging */}
        <BodyWeightCard profileId={profile.id} date={todayISO()} />

        {/* Profile management */}
        <button
          onClick={() => setMode("new")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-card py-3.5 font-semibold text-white transition-colors hover:bg-elevated"
        >
          <PlusIcon size={18} />
          Add another profile
        </button>

        <button
          onClick={handleDelete}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-card py-3.5 font-semibold text-danger transition-colors hover:bg-elevated"
        >
          <TrashIcon size={18} />
          Delete {profile.label}
        </button>
      </div>

      <NutritionNav />
    </main>
  );
}

function CalorieCyclingCard({
  profile,
  onSaved,
}: {
  profile: NutritionProfile;
  onSaved: () => Promise<unknown>;
}) {
  const [enabled, setEnabled] = useState(profile.calorieCyclingEnabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(profile.calorieCyclingEnabled);
  }, [profile.calorieCyclingEnabled]);

  async function toggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    setSaving(true);
    try {
      await saveProfile({
        ...profile,
        calorieCyclingEnabled: next,
        updatedAt: new Date().toISOString(),
      });
      if (getActiveProfileId() == null) setActiveProfileId(profile.id);
      await onSaved();
    } catch {
      setEnabled(!next); // revert on failure
    }
    setSaving(false);
  }

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-white">Training-day calorie cycling</h3>
          <p className="mt-1 text-xs text-muted">
            Auto-adjusts today’s calories from your lifting load — rest days
            lower, heavy or double days higher. Protein &amp; fat stay fixed;
            carbs flex.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle training-day calorie cycling"
          onClick={toggle}
          disabled={saving}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            enabled ? "bg-accent" : "bg-elevated"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </section>
  );
}

function WaterTargetCard({
  profile,
  onSaved,
}: {
  profile: NutritionProfile;
  onSaved: () => Promise<unknown>;
}) {
  const [value, setValue] = useState(String(profile.waterTargetMl));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setValue(String(profile.waterTargetMl));
  }, [profile.waterTargetMl]);

  async function save() {
    const ml = Math.max(Math.round(Number(value) || 0), 0);
    if (ml <= 0) return;
    setStatus("saving");
    await saveProfile({
      ...profile,
      waterTargetMl: ml,
      updatedAt: new Date().toISOString(),
    });
    // Keep the active selection stable across the reload.
    if (getActiveProfileId() == null) setActiveProfileId(profile.id);
    await onSaved();
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <section className="rounded-2xl bg-card p-4">
      <h3 className="font-bold text-white">Daily water target</h3>
      <div className="mt-3 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-elevated px-3 py-2.5">
          <input
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-transparent text-[15px] text-white focus:outline-none"
            aria-label="Daily water target in millilitres"
          />
          <span className="shrink-0 text-sm font-medium text-muted">ml</span>
        </label>
        <button
          onClick={save}
          disabled={status === "saving"}
          className="shrink-0 rounded-xl bg-accent px-5 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-50"
        >
          {status === "saving" ? "…" : status === "saved" ? "✓" : "Save"}
        </button>
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  big,
}: {
  label: string;
  value: string | number;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl bg-elevated p-2.5">
      <div
        className={`font-extrabold tabular-nums text-white ${
          big ? "text-xl" : "text-base"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium text-white">{v}</dd>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
