"use client";

import { getSupabase } from "../supabase";
import { todayISO, lastNDays } from "./dates";
import type {
  BodyWeightLog,
  FoodLog,
  MacroInputs,
  MacroTargets,
  NutritionProfile,
  NutritionSummary,
  WaterLog,
} from "./types";

/**
 * Nutrition persistence layer. Same dual-backend contract as lib/db.ts:
 *   • Supabase (Postgres + RLS)  — when NEXT_PUBLIC_SUPABASE_* env vars are set
 *   • localStorage               — automatic fallback so it works with zero setup
 *
 * The nutrition tables use uuid primary keys, so ids are real UUIDs (not the
 * "prefix_random" text ids the lifting tables use) — this keeps both stores
 * symmetrical and lets Supabase inserts carry a client-generated id.
 */

const LS_PROFILES = "zeus.nut.profiles.v1";
const LS_FOOD = "zeus.nut.foodLogs.v1";
const LS_WATER = "zeus.nut.waterLogs.v1";
const LS_BW = "zeus.nut.bwLogs.v1";

/** RFC4122 v4 id, with a tiny fallback for very old runtimes. */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── localStorage helpers ────────────────────────────────────────────────────
function lsRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const n = (v: unknown): number | null =>
  v == null || v === "" ? null : Number(v);

// ── Row <-> domain mappers (Supabase) ───────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToProfile(r: any): NutritionProfile {
  return {
    id: r.id,
    label: r.label,
    sex: r.sex,
    dateOfBirth: r.date_of_birth,
    weightKg: Number(r.weight_kg),
    heightCm: Number(r.height_cm),
    activityLevel: Number(r.activity_level),
    goal: r.goal,
    targetWeightKg: n(r.target_weight_kg),
    goalDeadline: r.goal_deadline ?? null,
    targets: {
      calories: Number(r.target_calories),
      protein_g: Number(r.target_protein_g),
      fat_g: Number(r.target_fat_g),
      carbs_g: Number(r.target_carbs_g),
    },
    waterTargetMl: Number(r.water_target_ml ?? 2500),
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  };
}

function profileToRow(p: NutritionProfile) {
  return {
    id: p.id,
    label: p.label,
    sex: p.sex,
    date_of_birth: p.dateOfBirth,
    weight_kg: p.weightKg,
    height_cm: p.heightCm,
    activity_level: p.activityLevel,
    goal: p.goal,
    target_weight_kg: p.targetWeightKg,
    goal_deadline: p.goalDeadline,
    target_calories: p.targets.calories,
    target_protein_g: p.targets.protein_g,
    target_fat_g: p.targets.fat_g,
    target_carbs_g: p.targets.carbs_g,
    water_target_ml: p.waterTargetMl,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function rowToFood(r: any): FoodLog {
  return {
    id: r.id,
    profileId: r.profile_id,
    loggedAt: r.logged_at,
    mealType: r.meal_type,
    foodName: r.food_name,
    brand: r.brand ?? null,
    servingSizeG: n(r.serving_size_g),
    calories: n(r.calories),
    proteinG: n(r.protein_g),
    fatG: n(r.fat_g),
    carbsG: n(r.carbs_g),
    fibreG: n(r.fibre_g),
    sugarG: n(r.sugar_g),
    openFoodFactsId: r.open_food_facts_id ?? null,
    createdAt: r.created_at ?? "",
  };
}

function foodToRow(f: FoodLog) {
  return {
    id: f.id,
    profile_id: f.profileId,
    logged_at: f.loggedAt,
    meal_type: f.mealType,
    food_name: f.foodName,
    brand: f.brand,
    serving_size_g: f.servingSizeG,
    calories: f.calories,
    protein_g: f.proteinG,
    fat_g: f.fatG,
    carbs_g: f.carbsG,
    fibre_g: f.fibreG,
    sugar_g: f.sugarG,
    open_food_facts_id: f.openFoodFactsId,
    created_at: f.createdAt,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Profiles ────────────────────────────────────────────────────────────────
export async function getProfiles(): Promise<NutritionProfile[]> {
  const sb = getSupabase();
  if (!sb) {
    return lsRead<NutritionProfile[]>(LS_PROFILES, []).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
  }
  const { data, error } = await sb
    .from("nutrition_profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToProfile);
}

export async function getProfileById(
  id: string
): Promise<NutritionProfile | null> {
  const all = await getProfiles();
  return all.find((p) => p.id === id) ?? null;
}

/** Build a full profile object from raw inputs + computed targets, ready to save. */
export function buildProfile(
  label: string,
  inputs: MacroInputs,
  targets: MacroTargets,
  waterTargetMl = 2500,
  existing?: NutritionProfile
): NutritionProfile {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? newId(),
    label,
    ...inputs,
    targets,
    waterTargetMl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function saveProfile(p: NutritionProfile): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    const all = lsRead<NutritionProfile[]>(LS_PROFILES, []);
    const idx = all.findIndex((x) => x.id === p.id);
    if (idx >= 0) all[idx] = p;
    else all.push(p);
    lsWrite(LS_PROFILES, all);
    return;
  }
  // user_id is omitted on purpose — the column defaults to auth.uid().
  const { error } = await sb.from("nutrition_profiles").upsert(profileToRow(p));
  if (error) throw new Error(error.message);
}

export async function deleteProfile(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    lsWrite(LS_PROFILES, lsRead<NutritionProfile[]>(LS_PROFILES, []).filter((p) => p.id !== id));
    lsWrite(LS_FOOD, lsRead<FoodLog[]>(LS_FOOD, []).filter((f) => f.profileId !== id));
    lsWrite(LS_WATER, lsRead<WaterLog[]>(LS_WATER, []).filter((w) => w.profileId !== id));
    lsWrite(LS_BW, lsRead<BodyWeightLog[]>(LS_BW, []).filter((b) => b.profileId !== id));
    return;
  }
  // FK on delete cascade clears the child logs for us.
  await sb.from("nutrition_profiles").delete().eq("id", id);
}

// ── Food logs ───────────────────────────────────────────────────────────────
export async function getFoodLogs(
  profileId: string,
  date: string
): Promise<FoodLog[]> {
  const sb = getSupabase();
  if (!sb) {
    return lsRead<FoodLog[]>(LS_FOOD, [])
      .filter((f) => f.profileId === profileId && f.loggedAt === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  const { data, error } = await sb
    .from("food_logs")
    .select("*")
    .eq("profile_id", profileId)
    .eq("logged_at", date)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToFood);
}

export async function getFoodLogsRange(
  profileId: string,
  startDate: string,
  endDate: string
): Promise<FoodLog[]> {
  const sb = getSupabase();
  if (!sb) {
    return lsRead<FoodLog[]>(LS_FOOD, []).filter(
      (f) =>
        f.profileId === profileId &&
        f.loggedAt >= startDate &&
        f.loggedAt <= endDate
    );
  }
  const { data, error } = await sb
    .from("food_logs")
    .select("*")
    .eq("profile_id", profileId)
    .gte("logged_at", startDate)
    .lte("logged_at", endDate)
    .order("logged_at", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToFood);
}

/** Create a food-log entry. Returns the saved row (with its id). */
export async function addFoodLog(
  entry: Omit<FoodLog, "id" | "createdAt">
): Promise<FoodLog> {
  const full: FoodLog = {
    ...entry,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  const sb = getSupabase();
  if (!sb) {
    const all = lsRead<FoodLog[]>(LS_FOOD, []);
    all.push(full);
    lsWrite(LS_FOOD, all);
    return full;
  }
  await sb.from("food_logs").insert(foodToRow(full));
  return full;
}

export async function deleteFoodLog(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    lsWrite(LS_FOOD, lsRead<FoodLog[]>(LS_FOOD, []).filter((f) => f.id !== id));
    return;
  }
  await sb.from("food_logs").delete().eq("id", id);
}

// ── Water ───────────────────────────────────────────────────────────────────
export async function getWaterTotal(
  profileId: string,
  date: string
): Promise<number> {
  const sb = getSupabase();
  if (!sb) {
    return lsRead<WaterLog[]>(LS_WATER, [])
      .filter((w) => w.profileId === profileId && w.loggedAt === date)
      .reduce((sum, w) => sum + w.amountMl, 0);
  }
  const { data, error } = await sb
    .from("water_logs")
    .select("amount_ml")
    .eq("profile_id", profileId)
    .eq("logged_at", date);
  if (error || !data) return 0;
  return data.reduce((sum, r) => sum + Number(r.amount_ml), 0);
}

export async function addWater(
  profileId: string,
  date: string,
  amountMl: number
): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    const all = lsRead<WaterLog[]>(LS_WATER, []);
    all.push({
      id: newId(),
      profileId,
      loggedAt: date,
      amountMl,
      createdAt: new Date().toISOString(),
    });
    lsWrite(LS_WATER, all);
    return;
  }
  await sb.from("water_logs").insert({
    id: newId(),
    profile_id: profileId,
    logged_at: date,
    amount_ml: amountMl,
  });
}

/** Map of ISO date → total ml, for a date range (used by history). */
export async function getWaterTotalsRange(
  profileId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const sb = getSupabase();
  const totals: Record<string, number> = {};
  const add = (date: string, ml: number) => {
    totals[date] = (totals[date] ?? 0) + ml;
  };
  if (!sb) {
    lsRead<WaterLog[]>(LS_WATER, [])
      .filter(
        (w) =>
          w.profileId === profileId &&
          w.loggedAt >= startDate &&
          w.loggedAt <= endDate
      )
      .forEach((w) => add(w.loggedAt, w.amountMl));
    return totals;
  }
  const { data } = await sb
    .from("water_logs")
    .select("logged_at, amount_ml")
    .eq("profile_id", profileId)
    .gte("logged_at", startDate)
    .lte("logged_at", endDate);
  (data ?? []).forEach((r) => add(r.logged_at, Number(r.amount_ml)));
  return totals;
}

// ── Body weight ─────────────────────────────────────────────────────────────
export async function getBodyWeightLogs(
  profileId: string,
  limit?: number
): Promise<BodyWeightLog[]> {
  const sb = getSupabase();
  let logs: BodyWeightLog[];
  if (!sb) {
    logs = lsRead<BodyWeightLog[]>(LS_BW, [])
      .filter((b) => b.profileId === profileId)
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  } else {
    const { data, error } = await sb
      .from("body_weight_logs")
      .select("*")
      .eq("profile_id", profileId)
      .order("logged_at", { ascending: true });
    logs = error || !data
      ? []
      : data.map((r) => ({
          id: r.id,
          profileId: r.profile_id,
          loggedAt: r.logged_at,
          weightKg: Number(r.weight_kg),
          createdAt: r.created_at ?? "",
        }));
  }
  return limit ? logs.slice(-limit) : logs;
}

/** Log today's (or a given day's) weight; one reading per profile per day. */
export async function addBodyWeight(
  profileId: string,
  date: string,
  weightKg: number
): Promise<void> {
  const sb = getSupabase();
  if (!sb) {
    const all = lsRead<BodyWeightLog[]>(LS_BW, []).filter(
      (b) => !(b.profileId === profileId && b.loggedAt === date)
    );
    all.push({
      id: newId(),
      profileId,
      loggedAt: date,
      weightKg,
      createdAt: new Date().toISOString(),
    });
    lsWrite(LS_BW, all);
    return;
  }
  await sb
    .from("body_weight_logs")
    .delete()
    .eq("profile_id", profileId)
    .eq("logged_at", date);
  await sb.from("body_weight_logs").insert({
    id: newId(),
    profile_id: profileId,
    logged_at: date,
    weight_kg: weightKg,
  });
}

// ── Macro aggregation ───────────────────────────────────────────────────────
export interface MacroTotals {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

/** Sum macros across a set of food logs (missing nutrients count as 0). */
export function sumMacros(logs: FoodLog[]): MacroTotals {
  return logs.reduce<MacroTotals>(
    (acc, f) => ({
      calories: acc.calories + (f.calories ?? 0),
      protein_g: acc.protein_g + (f.proteinG ?? 0),
      fat_g: acc.fat_g + (f.fatG ?? 0),
      carbs_g: acc.carbs_g + (f.carbsG ?? 0),
    }),
    { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  );
}

// ── Integration hooks (consumed by the future unified dashboard) ────────────
// userId is part of the documented contract; per-user scoping is enforced by
// RLS (and by profile ownership), so these read cleanly from the client too.

export async function getTodayNutritionSummary(
  _userId: string,
  profileId: string
): Promise<NutritionSummary> {
  const date = todayISO();
  const [profile, logs, water] = await Promise.all([
    getProfileById(profileId),
    getFoodLogs(profileId, date),
    getWaterTotal(profileId, date),
  ]);
  const totals = sumMacros(logs);
  const t = profile?.targets ?? { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };
  return {
    calories: { consumed: Math.round(totals.calories), target: t.calories },
    protein: { consumed: Math.round(totals.protein_g), target: t.protein_g },
    fat: { consumed: Math.round(totals.fat_g), target: t.fat_g },
    carbs: { consumed: Math.round(totals.carbs_g), target: t.carbs_g },
    water_ml: water,
    logged_at: date,
  };
}

export async function getWeeklyNutritionStats(
  _userId: string,
  profileId: string
): Promise<NutritionSummary[]> {
  const days = lastNDays(7);
  const [profile, logs, water] = await Promise.all([
    getProfileById(profileId),
    getFoodLogsRange(profileId, days[0], days[days.length - 1]),
    getWaterTotalsRange(profileId, days[0], days[days.length - 1]),
  ]);
  const t = profile?.targets ?? { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };
  return days.map((date) => {
    const totals = sumMacros(logs.filter((f) => f.loggedAt === date));
    return {
      calories: { consumed: Math.round(totals.calories), target: t.calories },
      protein: { consumed: Math.round(totals.protein_g), target: t.protein_g },
      fat: { consumed: Math.round(totals.fat_g), target: t.fat_g },
      carbs: { consumed: Math.round(totals.carbs_g), target: t.carbs_g },
      water_ml: water[date] ?? 0,
      logged_at: date,
    };
  });
}
