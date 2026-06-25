"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Goal,
  MacroInputs,
  MacroTargets,
  NutritionProfile,
  Sex,
} from "@/lib/nutrition/types";
import { ACTIVITY_LEVELS } from "@/lib/nutrition/types";
import { calculateMacros, GOAL_LABEL } from "@/lib/nutrition/macros";
import { buildProfile, saveProfile } from "@/lib/nutrition/db";
import {
  getProfile as getLiftingProfile,
  saveProfile as saveLiftingProfile,
} from "@/lib/db";
import { setActiveProfileId } from "@/lib/nutrition/active-profile";
import { formatShortDate } from "@/lib/nutrition/dates";
import { SparklesIcon } from "./icons";

interface Props {
  existing?: NutritionProfile;
  onSaved: (profile: NutritionProfile) => void;
  onCancel?: () => void;
  /** Pre-fill the profile name (e.g. the chosen Zeus/Hera persona). */
  defaultLabel?: string;
  /** Pre-fill the form fields (e.g. confirmed persona profile data). */
  defaults?: Partial<MacroInputs>;
}

const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The macro calculator — onboarding's centrepiece and the "recalculate" engine
 * in settings. Inputs flow live into a Mifflin-St Jeor summary; the user can
 * fine-tune the final targets before saving.
 */
export default function MacroOnboarding({
  existing,
  onSaved,
  onCancel,
  defaultLabel,
  defaults,
}: Props) {
  const [label, setLabel] = useState(existing?.label ?? defaultLabel ?? "");
  const [sex, setSex] = useState<Sex>(existing?.sex ?? defaults?.sex ?? "male");
  const [dob, setDob] = useState(
    existing?.dateOfBirth ?? defaults?.dateOfBirth ?? ""
  );
  const [weight, setWeight] = useState(
    existing
      ? String(existing.weightKg)
      : defaults?.weightKg != null
        ? String(defaults.weightKg)
        : ""
  );
  const [height, setHeight] = useState(
    existing
      ? String(existing.heightCm)
      : defaults?.heightCm != null
        ? String(defaults.heightCm)
        : ""
  );
  const [activity, setActivity] = useState(
    existing?.activityLevel ?? defaults?.activityLevel ?? 1.55
  );
  const [goal, setGoal] = useState<Goal>(
    existing?.goal ?? defaults?.goal ?? "lose"
  );
  const [targetWeight, setTargetWeight] = useState(
    existing?.targetWeightKg != null
      ? String(existing.targetWeightKg)
      : defaults?.targetWeightKg != null
        ? String(defaults.targetWeightKg)
        : ""
  );
  const [deadline, setDeadline] = useState(
    existing?.goalDeadline ?? defaults?.goalDeadline ?? ""
  );

  // Manual overrides of the computed targets.
  const [manual, setManual] = useState(false);
  const [targets, setTargets] = useState<MacroTargets>(
    existing?.targets ?? { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const inputs: MacroInputs | null = useMemo(() => {
    if (!dob || num(weight) <= 0 || num(height) <= 0) return null;
    return {
      sex,
      dateOfBirth: dob,
      weightKg: num(weight),
      heightCm: num(height),
      activityLevel: activity,
      goal,
      targetWeightKg:
        goal === "maintain" || goal === "recomp"
          ? null
          : targetWeight
            ? num(targetWeight)
            : null,
      goalDeadline:
        goal === "maintain" || goal === "recomp" ? null : deadline || null,
    };
  }, [sex, dob, weight, height, activity, goal, targetWeight, deadline]);

  const result = useMemo(
    () => (inputs ? calculateMacros(inputs) : null),
    [inputs]
  );

  // Keep targets in sync with the live calculation until the user edits them.
  useEffect(() => {
    if (result && !manual) {
      setTargets({
        calories: result.calories,
        protein_g: result.protein_g,
        fat_g: result.fat_g,
        carbs_g: result.carbs_g,
      });
    }
  }, [result, manual]);

  const canSave = label.trim() !== "" && inputs !== null && targets.calories > 0;

  async function handleSave() {
    if (!inputs || !canSave) return;
    setSaving(true);
    setSaveError("");
    const profile = buildProfile(
      label.trim(),
      inputs,
      targets,
      existing?.waterTargetMl ?? 2500,
      existing
    );
    try {
      await saveProfile(profile);
    } catch (err) {
      setSaveError(
        (err as Error)?.message ||
          "Couldn’t save your profile. Please try again."
      );
      setSaving(false);
      return;
    }
    setActiveProfileId(profile.id);
    // Keep the shared lifting profile's bodyweight in step so both sections
    // read the same weight (used by assisted-exercise logic).
    try {
      const lifting = await getLiftingProfile();
      if (lifting.persona) {
        await saveLiftingProfile({
          ...lifting,
          bodyweightKg: profile.weightKg,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      /* non-fatal */
    }
    onSaved(profile);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Identity */}
      <Field label="Profile name">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Zeus, Hera"
          className="w-full rounded-xl bg-elevated px-3 py-2.5 text-[15px] text-white placeholder:text-faint focus:outline-none"
        />
      </Field>

      <Field label="Sex">
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as Sex[]).map((s) => (
            <button
              key={s}
              onClick={() => setSex(s)}
              className={`rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors ${
                sex === s ? "bg-accent text-ink" : "bg-elevated text-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Date of birth">
        <input
          type="date"
          value={dob}
          max={today}
          onChange={(e) => setDob(e.target.value)}
          className="w-full rounded-xl bg-elevated px-3 py-2.5 text-[15px] text-white focus:outline-none [color-scheme:dark]"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight">
          <Unit unit="kg">
            <input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="80"
              className="w-full bg-transparent text-[15px] text-white placeholder:text-faint focus:outline-none"
            />
          </Unit>
        </Field>
        <Field label="Height">
          <Unit unit="cm">
            <input
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="180"
              className="w-full bg-transparent text-[15px] text-white placeholder:text-faint focus:outline-none"
            />
          </Unit>
        </Field>
      </div>

      <Field label="Activity level">
        <select
          value={activity}
          onChange={(e) => setActivity(Number(e.target.value))}
          className="w-full rounded-xl bg-elevated px-3 py-2.5 text-[15px] text-white focus:outline-none"
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label} — {a.hint}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Goal">
        <div className="grid grid-cols-2 gap-2">
          {(["lose", "maintain", "gain", "recomp"] as Goal[]).map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`rounded-xl px-2 py-3 text-xs font-semibold leading-tight transition-colors ${
                goal === g ? "bg-accent text-ink" : "bg-elevated text-muted"
              }`}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>
      </Field>

      {(goal === "lose" || goal === "gain") && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target weight">
            <Unit unit="kg">
              <input
                inputMode="decimal"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="75"
                className="w-full bg-transparent text-[15px] text-white placeholder:text-faint focus:outline-none"
              />
            </Unit>
          </Field>
          <Field label="Goal deadline">
            <input
              type="date"
              value={deadline}
              min={today}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl bg-elevated px-3 py-2.5 text-[15px] text-white focus:outline-none [color-scheme:dark]"
            />
          </Field>
        </div>
      )}

      {/* Summary card */}
      {result ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-2 text-accent">
            <SparklesIcon size={18} />
            <h3 className="font-bold">Your daily targets</h3>
          </div>

          <div className="mt-3 text-center">
            <div className="text-4xl font-extrabold tabular-nums text-white">
              {targets.calories}
              <span className="ml-1 text-base font-semibold text-muted">
                kcal
              </span>
            </div>
            <div className="mt-0.5 text-xs text-faint">
              BMR {result.bmr} · TDEE {result.tdee}
              {result.dailyDelta !== 0 &&
                ` · ${result.dailyDelta > 0 ? "+" : ""}${result.dailyDelta} kcal/day`}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Protein" value={`${targets.protein_g}g`} color="#38BDF8" />
            <Stat label="Fat" value={`${targets.fat_g}g`} color="#FBBF24" />
            <Stat label="Carbs" value={`${targets.carbs_g}g`} color="#A78BFA" />
          </div>

          {(goal === "lose" || goal === "gain") && (
            <p className="mt-3 text-center text-xs text-muted">
              ≈ {result.weeklyRateKg.toFixed(2)} kg/week{" "}
              {goal === "lose" ? "loss" : "gain"}
              {result.projectedDate &&
                ` · goal by ${formatShortDate(result.projectedDate)}`}
            </p>
          )}
          {goal === "recomp" && (
            <p className="mt-3 text-center text-xs text-muted">
              Eat around maintenance with high protein — recomposition comes
              from training, not the scale.
            </p>
          )}

          {/* Manual fine-tune */}
          <button
            onClick={() => setManual((m) => !m)}
            className="mt-3 w-full text-center text-xs font-semibold text-accent"
          >
            {manual ? "Hide manual adjustment" : "Adjust manually"}
          </button>
          {manual && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Adjust label="Calories" value={targets.calories} onChange={(v) => setTargets({ ...targets, calories: v })} />
              <Adjust label="Protein g" value={targets.protein_g} onChange={(v) => setTargets({ ...targets, protein_g: v })} />
              <Adjust label="Fat g" value={targets.fat_g} onChange={(v) => setTargets({ ...targets, fat_g: v })} />
              <Adjust label="Carbs g" value={targets.carbs_g} onChange={(v) => setTargets({ ...targets, carbs_g: v })} />
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-2xl bg-card p-4 text-center text-sm text-muted">
          Fill in your details to see your personalised targets.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-card py-3 font-semibold text-muted transition-colors hover:bg-elevated"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex-[2] rounded-xl bg-accent py-3 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Save & start tracking"}
        </button>
      </div>

      {saveError && (
        <p className="text-center text-sm text-danger">{saveError}</p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

function Unit({ unit, children }: { unit: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2.5">
      {children}
      <span className="shrink-0 text-sm font-medium text-muted">{unit}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-card/60 p-2.5">
      <div className="text-lg font-bold tabular-nums text-white">{value}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-muted">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </div>
    </div>
  );
}

function Adjust({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2">
      <span className="shrink-0 text-[11px] text-muted">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(Math.round(num(e.target.value)), 0))}
        className="w-full bg-transparent text-right text-sm font-semibold text-white focus:outline-none"
        aria-label={label}
      />
    </div>
  );
}
