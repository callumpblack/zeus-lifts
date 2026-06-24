"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  FoodSearchResult,
  MealType,
  NutritionProfile,
} from "@/lib/nutrition/types";
import { MEAL_LABEL, MEAL_TYPES } from "@/lib/nutrition/types";
import { searchFoods } from "@/lib/nutrition/openfoodfacts";
import { addFoodLog, getProfiles } from "@/lib/nutrition/db";
import { useActiveProfileId } from "@/lib/nutrition/active-profile";
import { isFutureDate, relativeDayLabel, todayISO } from "@/lib/nutrition/dates";
import NutritionNav from "@/components/nutrition/NutritionNav";
import AddFoodPanel, {
  type AddFoodPayload,
} from "@/components/nutrition/AddFoodPanel";
import { SearchIcon, ChevronLeftIcon, PlusIcon } from "@/components/icons";

type Status = "idle" | "loading" | "error" | "done";

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const meal = (params.get("meal") as MealType) ?? "snack";
  const date = params.get("date") ?? todayISO();

  const [activeId] = useActiveProfileId();
  const [profile, setProfile] = useState<NutritionProfile | null | undefined>(
    undefined
  );

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Resolve the active profile (redirect to onboarding if there isn't one).
  useEffect(() => {
    getProfiles().then((all) => {
      if (all.length === 0) {
        router.replace("/nutrition");
        return;
      }
      setProfile(all.find((p) => p.id === activeId) ?? all[0]);
    });
  }, [activeId, router]);

  // Debounced search.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setStatus("idle");
      setResults([]);
      return;
    }
    setStatus("loading");
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const hits = await searchFoods(term, ctrl.signal);
        setResults(hits);
        setStatus("done");
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStatus("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const panelOpen = selected !== null || manualOpen;

  const closePanel = useCallback(() => {
    setSelected(null);
    setManualOpen(false);
  }, []);

  async function handleConfirm(payload: AddFoodPayload) {
    if (!profile) return;
    setSaving(true);
    await addFoodLog({
      profileId: profile.id,
      loggedAt: date,
      mealType: payload.mealType,
      foodName: payload.foodName,
      brand: payload.brand,
      servingSizeG: payload.servingSizeG,
      calories: payload.calories,
      proteinG: payload.proteinG,
      fatG: payload.fatG,
      carbsG: payload.carbsG,
      fibreG: payload.fibreG,
      sugarG: payload.sugarG,
      openFoodFactsId: payload.openFoodFactsId,
    });
    setSaving(false);
    closePanel();
    setToast(`Added to ${MEAL_LABEL[payload.mealType]}`);
    setTimeout(() => setToast(null), 1800);
  }

  const backHref = useMemo(
    () => (date === todayISO() ? "/nutrition" : `/nutrition/log/${date}`),
    [date]
  );

  if (profile === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-24">
      <header className="sticky top-0 z-20 bg-ink/95 px-4 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(backHref)}
            aria-label="Back"
            className="rounded-lg p-1.5 text-white hover:bg-card"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <h1 className="text-xl font-bold text-white">Add food</h1>
          <span className="ml-auto text-xs font-medium text-muted">
            {MEAL_LABEL[meal]} · {relativeDayLabel(date)}
          </span>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-xl bg-card px-3 py-2.5">
          <SearchIcon size={18} className="shrink-0 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods, e.g. chicken breast"
            className="w-full bg-transparent text-[15px] text-white placeholder:text-faint focus:outline-none"
          />
        </label>

        {isFutureDate(date) && (
          <p className="mt-2 text-xs text-danger">
            You can’t log food for a future date.
          </p>
        )}
      </header>

      <div className="space-y-2 p-4">
        {/* Manual entry is always one tap away */}
        <button
          onClick={() => setManualOpen(true)}
          disabled={isFutureDate(date)}
          className="flex w-full items-center gap-2 rounded-xl bg-card px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-elevated disabled:opacity-50"
        >
          <PlusIcon size={18} />
          Log food manually
        </button>

        {status === "loading" && (
          <p className="py-8 text-center text-sm text-muted">Searching…</p>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-card p-5 text-center">
            <p className="font-semibold text-white">Search unavailable</p>
            <p className="mt-1 text-sm text-muted">
              Couldn’t reach the food database — try again shortly, or log it
              manually above.
            </p>
          </div>
        )}

        {status === "done" && results.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No matches for “{query.trim()}”. Try a different term or log it
            manually.
          </p>
        )}

        {status === "done" &&
          results.map((r) => (
            <button
              key={r.id}
              onClick={() => !isFutureDate(date) && setSelected(r)}
              disabled={isFutureDate(date)}
              className="w-full rounded-xl bg-card p-3.5 text-left transition-colors hover:bg-elevated disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">
                    {r.name}
                  </div>
                  {r.brand && (
                    <div className="truncate text-xs text-faint">{r.brand}</div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold tabular-nums text-white">
                    {r.caloriesPer100g == null
                      ? "—"
                      : Math.round(r.caloriesPer100g)}
                  </div>
                  <div className="text-[10px] text-faint">kcal/100g</div>
                </div>
              </div>
              <div className="mt-1.5 text-xs text-muted">
                P {macro(r.proteinPer100g)} · F {macro(r.fatPer100g)} · C{" "}
                {macro(r.carbsPer100g)}
                <span className="text-faint"> per 100g</span>
              </div>
            </button>
          ))}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-app justify-center px-4">
          <div className="rounded-full bg-success px-4 py-2 text-sm font-semibold text-ink shadow-lg">
            {toast} ✓
          </div>
        </div>
      )}

      <AddFoodPanel
        open={panelOpen}
        onClose={closePanel}
        result={selected}
        defaultMeal={meal}
        saving={saving}
        onConfirm={handleConfirm}
      />

      <NutritionNav />
    </main>
  );
}

const macro = (n: number | null) => (n == null ? "—" : `${Math.round(n)}g`);

export default function FoodSearchPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-muted">
          Loading…
        </main>
      }
    >
      <SearchInner />
    </Suspense>
  );
}
