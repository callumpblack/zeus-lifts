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
export const GAIN_SURPLUS = 300;

// Sex-based calorie floors — never prescribe a target below these (safety).
const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };

// Macro-split tuning. Protein is per-lb of bodyweight (by goal); fat is the
// HIGHER of a per-lb minimum (hormonal-health floor) and a share of calories;
// carbs fill the remainder.
const PROTEIN_PER_LB: Record<Goal, number> = {
  lose: 1.0, // higher end — protects muscle in a deficit
  recomp: 1.0, // recomp also demands high protein
  maintain: 0.82, // standard maintenance
  gain: 0.9, // slightly elevated for muscle synthesis
};
const FAT_MINIMUM_PER_LB = 0.35; // hard floor (g per lb of bodyweight)
const FAT_CALORIE_SHARE = 0.25; // 25% of calories (used when above the minimum)
const LOW_CARB_WARNING_G = 50; // warn below this — likely too aggressive a target

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
  /** True when the target was raised to the sex-based calorie floor. */
  belowCalorieFloor: boolean;
  /** True when carbs fell below the low-carb warning threshold. */
  lowCarbs: boolean;
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
    // Fall back to a gentle 0.5 kg/week pace when no target/deadline is given.
    let weeklyKg = 0.5;
    if (inputs.targetWeightKg != null && inputs.goalDeadline) {
      const weeks = Math.max(daysBetween(todayISO(), inputs.goalDeadline) / 7, 1);
      weeklyKg = Math.max(inputs.weightKg - inputs.targetWeightKg, 0) / weeks;
    }
    const wanted = (weeklyKg * KCAL_PER_KG) / 7;
    dailyDelta = -Math.min(wanted, MAX_DAILY_DEFICIT);
  } else if (inputs.goal === "gain") {
    dailyDelta = GAIN_SURPLUS;
  }

  // Apply the sex-based calorie floor before splitting macros.
  const floor = CALORIE_FLOOR[inputs.sex];
  const uncapped = roundTo10(tdeeValue + dailyDelta);
  const belowCalorieFloor = uncapped < floor;
  const calories = belowCalorieFloor ? floor : uncapped;

  // Protein per-lb (by goal); fat = max(per-lb minimum, share of calories);
  // carbs are the remainder.
  const lbs = inputs.weightKg * KG_TO_LBS;
  const protein_g = round(lbs * PROTEIN_PER_LB[inputs.goal]);
  const fat_g = ceilTo5(
    Math.max(lbs * FAT_MINIMUM_PER_LB, (calories * FAT_CALORIE_SHARE) / 9)
  );
  const carbs_g = Math.max(round((calories - protein_g * 4 - fat_g * 9) / 4), 0);
  const lowCarbs = carbs_g < LOW_CARB_WARNING_G;

  // Pace + projected date from the *effective* change (after any floor).
  const effectiveDelta = calories - tdeeValue;
  const weeklyRateKg = (Math.abs(effectiveDelta) * 7) / KCAL_PER_KG;
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
    dailyDelta: round(effectiveDelta),
    calories,
    protein_g,
    fat_g,
    carbs_g,
    weeklyRateKg,
    projectedDate,
    belowCalorieFloor,
    lowCarbs,
  };
}

/**
 * Default daily water target: 35 ml per kg of bodyweight, rounded to the
 * nearest 100 ml and clamped to a sane 2,000–4,000 ml range. Overridable in
 * Settings.
 */
export function defaultWaterTargetMl(weightKg: number): number {
  const ml = Math.round((35 * weightKg) / 100) * 100;
  return Math.min(Math.max(ml, 2000), 4000);
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
