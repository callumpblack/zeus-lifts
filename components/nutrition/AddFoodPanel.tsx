"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  FoodSearchResult,
  MealType,
} from "@/lib/nutrition/types";
import { MEAL_LABEL, MEAL_TYPES } from "@/lib/nutrition/types";
import { scalePer100g } from "@/lib/nutrition/openfoodfacts";
import Modal from "@/components/Modal";
import { CloseIcon } from "./icons";

/** What the panel emits on confirm — actual consumed amounts for the serving. */
export interface AddFoodPayload {
  foodName: string;
  brand: string | null;
  servingSizeG: number;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  fibreG: number | null;
  sugarG: number | null;
  openFoodFactsId: string | null;
  mealType: MealType;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-fill from a search result; null = blank manual entry. */
  result: FoodSearchResult | null;
  defaultMeal: MealType;
  saving?: boolean;
  onConfirm: (payload: AddFoodPayload) => void;
}

// Per-100g base values are edited as strings so fields can be blank.
interface Base {
  name: string;
  brand: string;
  cals: string;
  protein: string;
  fat: string;
  carbs: string;
  fibre: string;
  sugar: string;
  offId: string | null;
}

const str = (n: number | null) => (n == null ? "" : String(round1(n)));
const round1 = (n: number) => Math.round(n * 10) / 10;
const parse = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function baseFrom(result: FoodSearchResult | null): Base {
  return {
    name: result?.name ?? "",
    brand: result?.brand ?? "",
    cals: str(result?.caloriesPer100g ?? null),
    protein: str(result?.proteinPer100g ?? null),
    fat: str(result?.fatPer100g ?? null),
    carbs: str(result?.carbsPer100g ?? null),
    fibre: str(result?.fibrePer100g ?? null),
    sugar: str(result?.sugarPer100g ?? null),
    offId: result?.id ?? null,
  };
}

/** Add-to-log sheet: edit serving / meal / macros, live-preview, confirm. */
export default function AddFoodPanel({
  open,
  onClose,
  result,
  defaultMeal,
  saving,
  onConfirm,
}: Props) {
  const [base, setBase] = useState<Base>(() => baseFrom(result));
  const [serving, setServing] = useState("100");
  const [meal, setMeal] = useState<MealType>(defaultMeal);

  // Reset whenever a new result (or blank manual entry) is opened.
  useEffect(() => {
    if (open) {
      setBase(baseFrom(result));
      setServing("100");
      setMeal(defaultMeal);
    }
  }, [open, result, defaultMeal]);

  const servingG = parse(serving) ?? 0;
  const scaled = useMemo(() => {
    const s = (v: string) => scalePer100g(parse(v), servingG);
    return {
      cals: s(base.cals),
      protein: s(base.protein),
      fat: s(base.fat),
      carbs: s(base.carbs),
      fibre: s(base.fibre),
      sugar: s(base.sugar),
    };
  }, [base, servingG]);

  const valid = base.name.trim() !== "" && servingG > 0;

  function confirm() {
    if (!valid) return;
    onConfirm({
      foodName: base.name.trim(),
      brand: base.brand.trim() || null,
      servingSizeG: servingG,
      calories: scaled.cals,
      proteinG: scaled.protein,
      fatG: scaled.fat,
      carbsG: scaled.carbs,
      fibreG: scaled.fibre,
      sugarG: scaled.sugar,
      openFoodFactsId: base.offId,
      mealType: meal,
    });
  }

  return (
    <Modal open={open} onClose={onClose} variant="sheet" labelledBy="add-food-title">
      <div className="max-h-[85dvh] overflow-y-auto p-4 pb-6">
        <div className="flex items-center justify-between">
          <h2 id="add-food-title" className="text-lg font-bold text-white">
            Add to log
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted hover:bg-elevated"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Name + brand */}
        <label className="mt-4 block text-xs font-medium text-muted">Food</label>
        <input
          value={base.name}
          onChange={(e) => setBase({ ...base, name: e.target.value })}
          placeholder="e.g. Greek yoghurt"
          className="mt-1 w-full rounded-xl bg-elevated px-3 py-2.5 text-[15px] text-white placeholder:text-faint focus:outline-none"
        />
        <input
          value={base.brand}
          onChange={(e) => setBase({ ...base, brand: e.target.value })}
          placeholder="Brand (optional)"
          className="mt-2 w-full rounded-xl bg-elevated px-3 py-2.5 text-sm text-white placeholder:text-faint focus:outline-none"
        />

        {/* Serving + meal */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-muted">Serving</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-elevated px-3 py-2.5">
              <input
                inputMode="decimal"
                value={serving}
                onChange={(e) => setServing(e.target.value)}
                className="w-full bg-transparent text-[15px] text-white focus:outline-none"
                aria-label="Serving size in grams"
              />
              <span className="shrink-0 text-sm text-muted">g</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted">Meal</label>
            <select
              value={meal}
              onChange={(e) => setMeal(e.target.value as MealType)}
              className="mt-1 w-full rounded-xl bg-elevated px-3 py-[11px] text-[15px] text-white focus:outline-none"
            >
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Per-100g macro editors (blank = unknown, fill to log manually) */}
        <p className="mt-4 text-xs font-medium text-muted">
          Per 100g{" "}
          <span className="font-normal text-faint">— edit any that are missing</span>
        </p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <MacroInput label="Calories" value={base.cals} unit="kcal" onChange={(v) => setBase({ ...base, cals: v })} />
          <MacroInput label="Protein" value={base.protein} unit="g" onChange={(v) => setBase({ ...base, protein: v })} />
          <MacroInput label="Fat" value={base.fat} unit="g" onChange={(v) => setBase({ ...base, fat: v })} />
          <MacroInput label="Carbs" value={base.carbs} unit="g" onChange={(v) => setBase({ ...base, carbs: v })} />
        </div>

        {/* Live preview for the chosen serving */}
        <div className="mt-4 rounded-xl bg-elevated p-3">
          <div className="text-xs font-medium text-muted">
            This serving ({servingG || 0}g)
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            <Preview label="kcal" value={scaled.cals} />
            <Preview label="P" value={scaled.protein} suffix="g" />
            <Preview label="F" value={scaled.fat} suffix="g" />
            <Preview label="C" value={scaled.carbs} suffix="g" />
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={!valid || saving}
          className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add to log"}
        </button>
        {!valid && (
          <p className="mt-2 text-center text-xs text-faint">
            A name and a serving size above 0 are required.
          </p>
        )}
      </div>
    </Modal>
  );
}

function MacroInput({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2">
      <span className="shrink-0 text-xs text-muted">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="w-full bg-transparent text-right text-sm text-white placeholder:text-faint focus:outline-none"
        aria-label={`${label} per 100 grams`}
      />
      <span className="shrink-0 text-[11px] text-faint">{unit}</span>
    </div>
  );
}

function Preview({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div>
      <div className="text-base font-bold tabular-nums text-white">
        {value == null ? "—" : Math.round(value)}
        {value != null && suffix}
      </div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  );
}
