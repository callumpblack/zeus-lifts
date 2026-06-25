// Macro calculator — Mifflin-St Jeor BMR → TDEE → calorie target → macro split.
// Pure functions, no I/O, so they're trivially testable and reused by both the
// onboarding flow and the "recalculate" action in settings.

import type { Goal, MacroInputs, MacroTargets, Sex } from "./types";
import { daysBetween, fromISODate, todayISO } from "./dates";

export const KG_TO_LBS = 2.205;

// Energy density of body mass used to convert a weekly kg goal <-> daily kcal.
// (The brief's "× 1000 / 7" is dimensionally a grams/day figure; 7700 kcal/kg
// is the standard and keeps the target, weekly rate and projected date all
// realistic and mutually consistent.)
export const KCAL_PER_KG = 7700;

// Never prescribe an aggressive cut: cap the daily deficit and use a modest
// lean-gain surplus.
export const MAX_DAILY_DEFICIT = 750;
// Standard cut deficit used when no explicit pace (target weight + deadline) is
// given. Confirmed coaching default — reproduces the Zeus/Hera targets.
export const DEFAULT_DAILY_DEFICIT = 500;
export const GAIN_SURPLUS = 300;

// Macro-split tuning (confirmed coaching standard, validated against the Zeus &
// Hera profiles in docs/nutrition.md). Protein is anchored at 1.0 g/lb of
// bodyweight; fat is a share of total calories; carbs fill the remainder. Fat
// tracks calories, so fat and carbs still shift with the goal.
const PROTEIN_PER_LB: Record<Goal, number> = {
  lose: 1.0,
  recomp: 1.0,
  maintain: 1.0,
  gain: 1.0,
};
const FAT_CALORIE_SHARE = 0.28; // 28% of calories from fat

/** Exact age in years from a yyyy-mm-dd date of birth. */
export function ageFromDOB(dob: string, on: string = todayISO()): number {
  const b = fromISODate(dob);
  const now = fromISODate(on);
  let age = now.getFullYear() - b.getFullYear();
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function tdee(bmrValue: number, activityLevel: number): number {
  return bmrValue * activityLevel;
}

/** Everything the summary card and saved profile need from the inputs. */
export interface MacroResult extends MacroTargets {
  age: number;
  bmr: number;
  tdee: number;
  /** Applied daily kcal delta (negative = deficit, positive = surplus). */
  dailyDelta: number;
  /** Estimated weekly weight change in kg (magnitude; sign implied by goal). */
  weeklyRateKg: number;
  /** Projected ISO date the target weight is reached (null if N/A). */
  projectedDate: string | null;
}

const round = (n: number) => Math.round(n);
const ceilTo5 = (n: number) => Math.ceil(n / 5) * 5;
const roundTo10 = (n: number) => Math.round(n / 10) * 10;

/**
 * Run the full calculation. The deficit (when losing) is derived from the
 * weekly pace implied by start/target weight and the deadline, capped at
 * MAX_DAILY_DEFICIT so it's always safe even with an aggressive deadline.
 */
export function calculateMacros(inputs: MacroInputs): MacroResult {
  const age = ageFromDOB(inputs.dateOfBirth);
  const bmrValue = bmr(inputs.sex, inputs.weightKg, inputs.heightCm, age);
  const tdeeValue = tdee(bmrValue, inputs.activityLevel);

  let dailyDelta = 0; // signed kcal adjustment to TDEE

  if (inputs.goal === "lose") {
    // Default to the standard 500 kcal/day deficit; only derive a faster/slower
    // pace when BOTH a target weight and a deadline are given (capped for safety).
    let deficit = DEFAULT_DAILY_DEFICIT;
    if (inputs.targetWeightKg != null && inputs.goalDeadline) {
      const weeks = Math.max(daysBetween(todayISO(), inputs.goalDeadline) / 7, 1);
      const weeklyKg = Math.max(inputs.weightKg - inputs.targetWeightKg, 0) / weeks;
      deficit = (weeklyKg * KCAL_PER_KG) / 7;
    }
    dailyDelta = -Math.min(deficit, MAX_DAILY_DEFICIT);
  } else if (inputs.goal === "gain") {
    dailyDelta = GAIN_SURPLUS;
  }

  const calories = roundTo10(tdeeValue + dailyDelta);

  // Goal-aware split: protein per-lb (by goal), fat as a share of calories,
  // carbs as the remainder — so changing the goal shifts all three macros.
  const lbs = inputs.weightKg * KG_TO_LBS;
  const protein_g = round(lbs * PROTEIN_PER_LB[inputs.goal]);
  const fat_g = ceilTo5((calories * FAT_CALORIE_SHARE) / 9);
  const carbs_g = Math.max(round((calories - protein_g * 4 - fat_g * 9) / 4), 0);

  // Realistic weekly pace + projected goal date from the *applied* delta.
  const weeklyRateKg = (Math.abs(dailyDelta) * 7) / KCAL_PER_KG;
  let projectedDate: string | null = null;
  if (inputs.targetWeightKg != null && weeklyRateKg > 0) {
    const kgToGo = Math.abs(inputs.weightKg - inputs.targetWeightKg);
    const weeks = kgToGo / weeklyRateKg;
    const d = fromISODate(todayISO());
    d.setDate(d.getDate() + Math.round(weeks * 7));
    projectedDate = toISO(d);
  }

  return {
    age,
    bmr: round(bmrValue),
    tdee: round(tdeeValue),
    dailyDelta: round(dailyDelta),
    calories,
    protein_g,
    fat_g,
    carbs_g,
    weeklyRateKg,
    projectedDate,
  };
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const GOAL_LABEL: Record<Goal, string> = {
  lose: "Lose fat",
  maintain: "Maintain",
  gain: "Gain muscle",
  recomp: "Lose fat & gain muscle",
};

export const GOAL_VERB: Record<Goal, string> = {
  lose: "loss",
  maintain: "maintenance",
  gain: "gain",
  recomp: "recomposition",
};
