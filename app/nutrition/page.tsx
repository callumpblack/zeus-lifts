"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FoodLog, MealType, NutritionProfile } from "@/lib/nutrition/types";
import { MEAL_TYPES } from "@/lib/nutrition/types";
import {
  addWater,
  deleteFoodLog,
  getFoodLogs,
  getProfiles,
  getWaterTotal,
  sumMacros,
} from "@/lib/nutrition/db";
import { useActiveProfileId } from "@/lib/nutrition/active-profile";
import { relativeDayLabel, todayISO } from "@/lib/nutrition/dates";
import {
  applyCycle,
  getDayActivity,
  type DayActivity,
} from "@/lib/nutrition/cycling";
import NutritionNav from "@/components/nutrition/NutritionNav";
import NutritionHeader from "@/components/nutrition/NutritionHeader";
import MacroSummary from "@/components/nutrition/MacroSummary";
import MealSection from "@/components/nutrition/MealSection";
import WaterTracker from "@/components/nutrition/WaterTracker";
import BodyWeightCard from "@/components/nutrition/BodyWeightCard";
import MacroOnboarding from "@/components/nutrition/MacroOnboarding";

export default function NutritionDashboard() {
  const router = useRouter();
  const date = todayISO();
  const [profiles, setProfiles] = useState<NutritionProfile[] | null>(null);
  const [activeId, setActiveId] = useActiveProfileId();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [water, setWater] = useState(0);
  const [activity, setActivity] = useState<DayActivity | null>(null);

  const reloadProfiles = useCallback(async () => {
    setProfiles(await getProfiles());
  }, []);

  useEffect(() => {
    reloadProfiles();
  }, [reloadProfiles]);

  // Resolve the active profile, defaulting to the first one.
  const profile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeId) ?? profiles[0];
  }, [profiles, activeId]);

  useEffect(() => {
    if (profile && profile.id !== activeId) setActiveId(profile.id);
  }, [profile, activeId, setActiveId]);

  const loadDay = useCallback(async () => {
    if (!profile) return;
    const [f, w] = await Promise.all([
      getFoodLogs(profile.id, date),
      getWaterTotal(profile.id, date),
    ]);
    setLogs(f);
    setWater(w);
    // Auto-adjust the target from today's lifting load when cycling is on.
    setActivity(
      profile.calorieCyclingEnabled ? await getDayActivity(date) : null
    );
  }, [profile, date]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  // ── First visit: no profile yet → onboarding ──────────────────────────────
  if (profiles === null) {
    return (
      <main className="min-h-dvh pb-24">
        <div className="flex min-h-dvh items-center justify-center text-muted">
          Loading…
        </div>
      </main>
    );
  }

  if (profiles.length === 0 || !profile) {
    return (
      <main className="min-h-dvh pb-10">
        <header className="px-4 pb-2 pt-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome to <span className="text-accent">Nutrition</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Let’s calculate your personalised macro targets to get started.
          </p>
        </header>
        <div className="p-4">
          <MacroOnboarding onSaved={() => reloadProfiles()} />
        </div>
      </main>
    );
  }

  // ── Normal dashboard ──────────────────────────────────────────────────────
  const consumed = sumMacros(logs);
  const empty = logs.length === 0;
  // Effective target = base, plus today's lifting-load adjustment when cycling.
  const targets = activity ? applyCycle(profile.targets, activity) : profile.targets;

  async function handleAddWater(ml: number) {
    if (!profile) return;
    setWater((w) => w + ml); // optimistic
    await addWater(profile.id, date, ml);
    setWater(await getWaterTotal(profile.id, date));
  }

  async function handleDelete(id: string) {
    setLogs((l) => l.filter((f) => f.id !== id)); // optimistic
    await deleteFoodLog(id);
    loadDay();
  }

  function goAdd(meal: MealType) {
    router.push(`/nutrition/search?meal=${meal}&date=${date}`);
  }

  const byMeal = (meal: MealType) => logs.filter((f) => f.mealType === meal);

  return (
    <main className="min-h-dvh pb-24">
      <NutritionHeader
        title="Today"
        subtitle={relativeDayLabel(date)}
        profiles={profiles}
        activeId={profile.id}
        onProfileChange={setActiveId}
      />

      <div className="space-y-3 p-4">
        {activity && <CycleBadge activity={activity} />}
        <MacroSummary consumed={consumed} targets={targets} />

        {empty && (
          <p className="rounded-2xl bg-card/60 px-4 py-3 text-center text-sm text-muted">
            Nothing logged yet — add your first meal below.
          </p>
        )}

        {MEAL_TYPES.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            logs={byMeal(meal)}
            onAdd={goAdd}
            onDelete={handleDelete}
          />
        ))}

        <WaterTracker
          consumedMl={water}
          targetMl={profile.waterTargetMl}
          onAdd={handleAddWater}
        />

        <BodyWeightCard profileId={profile.id} date={date} />
      </div>

      <NutritionNav />
    </main>
  );
}

/** Compact badge showing today's auto activity tier + calorie adjustment. */
function CycleBadge({ activity }: { activity: DayActivity }) {
  const dot =
    activity.tier === "rest"
      ? "bg-sky-400"
      : activity.tier === "high"
        ? "bg-[#FBBF24]"
        : "bg-accent";
  const adj = activity.calorieAdjustment;
  const adjColor =
    adj > 0 ? "text-[#FBBF24]" : adj < 0 ? "text-sky-400" : "text-muted";
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <div>
          <div className="text-sm font-semibold text-white">{activity.label}</div>
          <div className="text-[11px] text-muted">
            {activity.sessions === 0
              ? "No lifting logged today"
              : `${activity.sessions} session${
                  activity.sessions > 1 ? "s" : ""
                } · ${Math.round(activity.volumeKg).toLocaleString()} kg`}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold tabular-nums ${adjColor}`}>
          {adj === 0 ? "On target" : `${adj > 0 ? "+" : ""}${adj} kcal`}
        </div>
        <div className="text-[10px] text-faint">auto from lifting</div>
      </div>
    </div>
  );
}
