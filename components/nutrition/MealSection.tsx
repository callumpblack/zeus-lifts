"use client";

import type { FoodLog, MealType } from "@/lib/nutrition/types";
import { MEAL_LABEL } from "@/lib/nutrition/types";
import { sumMacros } from "@/lib/nutrition/db";
import { PlusIcon, TrashIcon } from "@/components/icons";

interface Props {
  meal: MealType;
  logs: FoodLog[];
  onAdd: (meal: MealType) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

const macroLine = (f: FoodLog) => {
  const parts: string[] = [];
  if (f.servingSizeG != null) parts.push(`${round(f.servingSizeG)}g`);
  parts.push(`P ${dash(f.proteinG)}`);
  parts.push(`F ${dash(f.fatG)}`);
  parts.push(`C ${dash(f.carbsG)}`);
  return parts.join("  ·  ");
};

const round = (n: number) => Math.round(n);
const dash = (n: number | null) => (n == null ? "—" : `${round(n)}g`);

/** One meal group: its foods, a running calorie subtotal, and an add button. */
export default function MealSection({
  meal,
  logs,
  onAdd,
  onDelete,
  readOnly,
}: Props) {
  const subtotal = Math.round(sumMacros(logs).calories);

  return (
    <section className="rounded-2xl bg-card">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <h3 className="font-bold text-white">{MEAL_LABEL[meal]}</h3>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {subtotal} kcal
        </span>
      </div>

      {logs.length > 0 && (
        <ul className="mt-2 divide-y divide-hairline">
          {logs.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {f.foodName}
                  {f.brand && (
                    <span className="font-normal text-faint"> · {f.brand}</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted">{macroLine(f)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold tabular-nums text-white">
                  {f.calories == null ? "—" : round(f.calories)}
                </div>
                <div className="text-[10px] text-faint">kcal</div>
              </div>
              {!readOnly && onDelete && (
                <button
                  onClick={() => onDelete(f.id)}
                  aria-label={`Remove ${f.foodName}`}
                  className="shrink-0 rounded-lg p-1.5 text-faint transition-colors hover:bg-elevated hover:text-danger"
                >
                  <TrashIcon size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <button
          onClick={() => onAdd(meal)}
          className="mt-1 flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-elevated/50 rounded-b-2xl"
        >
          <PlusIcon size={16} />
          Add food
        </button>
      )}
    </section>
  );
}
