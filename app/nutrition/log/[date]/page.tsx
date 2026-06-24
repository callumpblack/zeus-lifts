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
import {
  addDays,
  formatLongDate,
  isFutureDate,
  relativeDayLabel,
  todayISO,
} from "@/lib/nutrition/dates";
import NutritionNav from "@/components/nutrition/NutritionNav";
import NutritionHeader from "@/components/nutrition/NutritionHeader";
import MacroSummary from "@/components/nutrition/MacroSummary";
import MealSection from "@/components/nutrition/MealSection";
import WaterTracker from "@/components/nutrition/WaterTracker";
import { ChevronLeftIcon } from "@/components/icons";
import { ChevronRightIcon } from "@/components/nutrition/icons";

export default function LogDatePage({
  params,
}: {
  params: { date: string };
}) {
  const router = useRouter();
  const date = params.date;

  const [profiles, setProfiles] = useState<NutritionProfile[] | null>(null);
  const [activeId, setActiveId] = useActiveProfileId();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [water, setWater] = useState(0);

  useEffect(() => {
    getProfiles().then((all) => {
      if (all.length === 0) {
        router.replace("/nutrition");
        return;
      }
      setProfiles(all);
    });
  }, [router]);

  const profile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeId) ?? profiles[0];
  }, [profiles, activeId]);

  const loadDay = useCallback(async () => {
    if (!profile) return;
    const [f, w] = await Promise.all([
      getFoodLogs(profile.id, date),
      getWaterTotal(profile.id, date),
    ]);
    setLogs(f);
    setWater(w);
  }, [profile, date]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  if (!profiles || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </main>
    );
  }

  const consumed = sumMacros(logs);
  const canGoNext = !isFutureDate(addDays(date, 1));

  async function handleAddWater(ml: number) {
    if (!profile) return;
    setWater((w) => w + ml);
    await addWater(profile.id, date, ml);
    setWater(await getWaterTotal(profile.id, date));
  }
  async function handleDelete(id: string) {
    setLogs((l) => l.filter((f) => f.id !== id));
    await deleteFoodLog(id);
    loadDay();
  }
  function goAdd(meal: MealType) {
    router.push(`/nutrition/search?meal=${meal}&date=${date}`);
  }
  function step(delta: number) {
    const next = addDays(date, delta);
    router.push(next === todayISO() ? "/nutrition" : `/nutrition/log/${next}`);
  }

  const stepper = (
    <div className="flex items-center gap-1">
      <button
        onClick={() => step(-1)}
        aria-label="Previous day"
        className="rounded-lg p-1.5 text-white hover:bg-card"
      >
        <ChevronLeftIcon size={20} />
      </button>
      <button
        onClick={() => step(1)}
        disabled={!canGoNext}
        aria-label="Next day"
        className="rounded-lg p-1.5 text-white hover:bg-card disabled:opacity-30"
      >
        <ChevronRightIcon size={20} />
      </button>
    </div>
  );

  return (
    <main className="min-h-dvh pb-24">
      <NutritionHeader
        title={relativeDayLabel(date)}
        subtitle={formatLongDate(date)}
        profiles={profiles}
        activeId={profile.id}
        onProfileChange={setActiveId}
        right={stepper}
      />

      <div className="space-y-3 p-4">
        <MacroSummary consumed={consumed} targets={profile.targets} />

        {logs.length === 0 && (
          <p className="rounded-2xl bg-card/60 px-4 py-3 text-center text-sm text-muted">
            Nothing was logged on this day.
          </p>
        )}

        {MEAL_TYPES.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            logs={logs.filter((f) => f.mealType === meal)}
            onAdd={goAdd}
            onDelete={handleDelete}
            readOnly={isFutureDate(date)}
          />
        ))}

        <WaterTracker
          consumedMl={water}
          targetMl={profile.waterTargetMl}
          onAdd={handleAddWater}
          disabled={isFutureDate(date)}
        />
      </div>

      <NutritionNav />
    </main>
  );
}
