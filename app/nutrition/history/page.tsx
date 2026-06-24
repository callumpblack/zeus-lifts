"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  BodyWeightLog,
  FoodLog,
  NutritionProfile,
} from "@/lib/nutrition/types";
import {
  getBodyWeightLogs,
  getFoodLogsRange,
  getProfiles,
} from "@/lib/nutrition/db";
import { useActiveProfileId } from "@/lib/nutrition/active-profile";
import {
  addDays,
  formatShortDate,
  lastNDays,
  todayISO,
  weekdayLabel,
} from "@/lib/nutrition/dates";
import {
  adherenceScore,
  averageMacro,
  loggedDays,
  longestStreak,
  macrosByDay,
  mean,
  weightSeries,
} from "@/lib/nutrition/stats";
import NutritionNav from "@/components/nutrition/NutritionNav";
import NutritionHeader from "@/components/nutrition/NutritionHeader";
import { CalorieBars, TrendLine, type ChartPoint } from "@/components/nutrition/charts";

type Range = "week" | "month" | "all";
const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30, all: 365 };

export default function HistoryPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<NutritionProfile[] | null>(null);
  const [activeId, setActiveId] = useActiveProfileId();
  const [range, setRange] = useState<Range>("week");
  const [foods, setFoods] = useState<FoodLog[]>([]);
  const [weights, setWeights] = useState<BodyWeightLog[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Pull a year of data up-front; all three views slice from it client-side.
  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    const start = addDays(todayISO(), -364);
    Promise.all([
      getFoodLogsRange(profile.id, start, todayISO()),
      getBodyWeightLogs(profile.id),
    ]).then(([f, w]) => {
      setFoods(f);
      setWeights(w);
      setLoading(false);
    });
  }, [profile]);

  if (!profiles || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </main>
    );
  }

  const target = profile.targets;

  // Window for the selected range.
  const days = lastNDays(RANGE_DAYS[range]);
  const windowFoods = foods.filter((f) => f.loggedAt >= days[0]);
  const byDay = macrosByDay(windowFoods);
  const logged = loggedDays(windowFoods);

  const caloriePoints: ChartPoint[] = days.map((d) => ({
    label: range === "week" ? weekdayLabel(d) : "",
    value: byDay.get(d)?.calories ?? null,
  }));

  const weightVals = weightSeries(weights, days);
  const weightPoints: ChartPoint[] = days.map((d, i) => ({
    label: formatShortDate(d),
    value: weightVals[i],
  }));

  const avgCalories = Math.round(
    mean([...byDay.values()].map((m) => m.calories))
  );
  const avgProtein = averageMacro(byDay, "protein_g");
  const avgFat = averageMacro(byDay, "fat_g");
  const avgCarbs = averageMacro(byDay, "carbs_g");
  const adherence = adherenceScore(byDay, target.calories);
  const streak = longestStreak(logged);

  return (
    <main className="min-h-dvh pb-24">
      <NutritionHeader
        title="History"
        profiles={profiles}
        activeId={profile.id}
        onProfileChange={setActiveId}
      />

      <div className="px-4">
        <div className="inline-flex w-full rounded-xl bg-card p-1">
          {(["week", "month", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                range === r ? "bg-accent text-ink" : "text-muted"
              }`}
            >
              {r === "all" ? "All time" : r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted">Crunching numbers…</p>
      ) : logged.length === 0 ? (
        <div className="flex flex-col items-center pt-20 text-center">
          <p className="font-semibold text-white">No data yet</p>
          <p className="mt-1 px-8 text-sm text-muted">
            Log a few days of food and your trends will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {/* Top stat tiles */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label={range === "all" ? "Avg daily (all)" : "Avg daily kcal"}
              value={`${avgCalories}`}
              sub={`target ${target.calories}`}
            />
            <StatTile
              label="Days logged"
              value={`${logged.length}`}
              sub={range === "week" ? "of 7" : range === "month" ? "of 30" : "this year"}
            />
            <StatTile
              label="Adherence"
              value={`${adherence}%`}
              sub="within ±10% kcal"
            />
            <StatTile
              label={range === "week" ? "Best streak" : "Longest streak"}
              value={`${streak}`}
              sub={streak === 1 ? "day" : "days"}
            />
          </div>

          {/* Calories chart */}
          <section className="rounded-2xl bg-card p-4">
            <h3 className="mb-3 font-bold text-white">
              {range === "week" ? "Calories this week" : "Calorie trend"}
            </h3>
            {range === "week" ? (
              <CalorieBars data={caloriePoints} target={target.calories} />
            ) : (
              <TrendLine
                data={caloriePoints}
                target={target.calories}
                unit=""
              />
            )}
          </section>

          {/* Macro averages vs targets */}
          <section className="rounded-2xl bg-card p-4">
            <h3 className="mb-3 font-bold text-white">Average macros</h3>
            <MacroAvgRow label="Protein" avg={avgProtein} target={target.protein_g} color="#38BDF8" />
            <MacroAvgRow label="Fat" avg={avgFat} target={target.fat_g} color="#FBBF24" />
            <MacroAvgRow label="Carbs" avg={avgCarbs} target={target.carbs_g} color="#A78BFA" />
          </section>

          {/* Bodyweight trend */}
          <section className="rounded-2xl bg-card p-4">
            <h3 className="mb-3 font-bold text-white">Bodyweight</h3>
            <TrendLine
              data={weightPoints}
              color="#10B981"
              target={profile.targetWeightKg}
              precision={1}
              unit="kg"
            />
          </section>
        </div>
      )}

      <NutritionNav />
    </main>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-white">
        {value}
      </div>
      <div className="text-[11px] text-faint">{sub}</div>
    </div>
  );
}

function MacroAvgRow({
  label,
  avg,
  target,
  color,
}: {
  label: string;
  avg: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min((avg / target) * 100, 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-1.5 text-white">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="tabular-nums text-muted">
          {avg}g{" "}
          <span className="text-faint">/ {target}g</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
