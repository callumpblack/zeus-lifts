// Shared domain types for the Zeus Lifts nutrition tracker.

export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain" | "recomp";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

/** Activity multipliers applied to BMR to get TDEE (Mifflin-St Jeor). */
export interface ActivityLevel {
  value: number; // multiplier
  label: string;
  hint: string;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { value: 1.2, label: "Sedentary", hint: "Desk job, little movement" },
  { value: 1.375, label: "Lightly active", hint: "1–3 sessions / week" },
  { value: 1.55, label: "Moderately active", hint: "3–5 sessions / week" },
  { value: 1.725, label: "Very active", hint: "6–7 hard sessions / week" },
  { value: 1.9, label: "Athlete", hint: "2×/day or physical job + training" },
];

/** The macro targets a profile is held to each day. */
export interface MacroTargets {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

/** The raw inputs the macro calculator runs on. */
export interface MacroInputs {
  sex: Sex;
  dateOfBirth: string; // ISO date (yyyy-mm-dd)
  weightKg: number;
  heightCm: number;
  activityLevel: number; // multiplier
  goal: Goal;
  targetWeightKg: number | null;
  goalDeadline: string | null; // ISO date
}

/** A saved nutrition profile (e.g. "Zeus", "Hera"). */
export interface NutritionProfile extends MacroInputs {
  id: string;
  label: string;
  targets: MacroTargets;
  waterTargetMl: number;
  /** When on, the daily target auto-adjusts from that day's lifting load. */
  calorieCyclingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A single logged food item. */
export interface FoodLog {
  id: string;
  profileId: string;
  loggedAt: string; // ISO date
  mealType: MealType;
  foodName: string;
  brand: string | null;
  servingSizeG: number | null;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  openFoodFactsId: string | null;
  createdAt: string;
}

export interface BodyWeightLog {
  id: string;
  profileId: string;
  loggedAt: string; // ISO date
  weightKg: number;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  profileId: string;
  loggedAt: string; // ISO date
  amountMl: number;
  createdAt: string;
}

/** A normalised Open Food Facts search result (per 100 g/ml). */
export interface FoodSearchResult {
  id: string; // barcode / product code
  name: string;
  brand: string | null;
  // Per-100g values; null when the product is missing that nutrient.
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  carbsPer100g: number | null;
  fibrePer100g: number | null;
  sugarPer100g: number | null;
}

// ── Integration-hook shapes (consumed by the future unified dashboard) ──────

export interface MacroProgress {
  consumed: number;
  target: number;
}

/** Returned by getTodayNutritionSummary — one day's consumed-vs-target. */
export interface NutritionSummary {
  calories: MacroProgress;
  protein: MacroProgress;
  fat: MacroProgress;
  carbs: MacroProgress;
  water_ml: number;
  logged_at: string;
}
