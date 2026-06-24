"use client";

import type { NutritionProfile } from "@/lib/nutrition/types";

interface Props {
  profiles: NutritionProfile[];
  activeId: string | null;
  onChange: (id: string) => void;
}

/**
 * Household profile switcher (e.g. Zeus / Hera) as a pill toggle. Hidden when
 * there's only one profile — nothing to switch between.
 */
export default function ProfileSwitcher({ profiles, activeId, onChange }: Props) {
  if (profiles.length < 2) return null;

  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-card p-1 no-scrollbar">
      {profiles.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            aria-current={active ? "true" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-accent text-ink" : "text-muted hover:text-white"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
