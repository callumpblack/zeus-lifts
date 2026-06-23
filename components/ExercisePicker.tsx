"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExerciseDef } from "@/lib/types";
import {
  EXERCISE_LIBRARY,
  ALL_EQUIPMENT,
  ALL_MUSCLES,
  findExercise,
} from "@/lib/exercises";
import ExerciseImage from "./ExerciseImage";
import {
  SearchIcon,
  TrendingIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseDef) => void;
  /** Exercise names most-recently-used first (max ~10 shown). */
  recentNames?: string[];
}

/** Full-screen exercise picker sheet, shared by workouts and routine editing. */
export default function ExercisePicker({
  open,
  onClose,
  onPick,
  recentNames = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState("All Equipment");
  const [muscle, setMuscle] = useState("All Muscles");
  const [openFilter, setOpenFilter] = useState<null | "equipment" | "muscle">(
    null
  );

  // Reset transient state each time the sheet opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setEquipment("All Equipment");
      setMuscle("All Muscles");
      setOpenFilter(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter((e) => {
      if (equipment !== "All Equipment" && e.equipment !== equipment) return false;
      if (muscle !== "All Muscles" && e.primaryMuscle !== muscle) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, equipment, muscle]);

  const recent = useMemo(() => {
    return recentNames
      .map((n) => findExercise(n))
      .filter((e): e is ExerciseDef => Boolean(e))
      .filter((e) => filtered.includes(e))
      .slice(0, 10);
  }, [recentNames, filtered]);

  // Group the filtered list alphabetically by first letter.
  const groups = useMemo(() => {
    const map = new Map<string, ExerciseDef[]>();
    for (const e of [...filtered].sort((a, b) => a.name.localeCompare(b.name))) {
      const letter = e.name[0].toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  const Row = ({ e }: { e: ExerciseDef }) => (
    <button
      onClick={() => onPick(e)}
      className="flex w-full items-center gap-3 py-2.5 text-left transition-colors active:bg-card"
    >
      <ExerciseImage slug={e.slug} alt={e.name} size={48} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-white">{e.name}</div>
        <div className="truncate text-sm text-muted">{e.primaryMuscle}</div>
      </div>
      <TrendingIcon size={18} className="shrink-0 text-faint" aria-hidden />
    </button>
  );

  const FilterButton = ({
    kind,
    label,
    value,
  }: {
    kind: "equipment" | "muscle";
    label: string;
    value: string;
  }) => {
    const active = value !== label;
    return (
      <button
        onClick={() => setOpenFilter((p) => (p === kind ? null : kind))}
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-accent text-white"
            : "bg-elevated text-white hover:bg-hairline"
        }`}
      >
        {value}
        <ChevronDownIcon size={16} />
      </button>
    );
  };

  const options = openFilter === "equipment" ? ALL_EQUIPMENT : ALL_MUSCLES;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-app animate-slide-up flex-col bg-ink">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <button
          onClick={onClose}
          className="flex items-center text-accent transition-opacity hover:opacity-80"
        >
          <ChevronLeftIcon size={22} />
          <span className="font-medium">Cancel</span>
        </button>
        <span className="font-semibold text-white">Add Exercise</span>
        <span className="w-[68px]" />
      </div>

      {/* Search + filters */}
      <div className="space-y-3 px-4 pb-2 pt-3">
        <label className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2.5">
          <SearchIcon size={18} className="text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercise"
            className="w-full bg-transparent text-[15px] text-white placeholder:text-faint focus:outline-none"
          />
        </label>
        <div className="relative flex gap-2">
          <FilterButton kind="equipment" label="All Equipment" value={equipment} />
          <FilterButton kind="muscle" label="All Muscles" value={muscle} />

          {openFilter && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenFilter(null)}
              />
              <div className="absolute left-0 top-11 z-20 max-h-72 w-56 overflow-y-auto rounded-xl border border-hairline bg-elevated py-1 shadow-2xl">
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (openFilter === "equipment") setEquipment(opt);
                      else setMuscle(opt);
                      setOpenFilter(null);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-white hover:bg-hairline"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8">
        {recent.length > 0 && (
          <section className="mb-2">
            <h4 className="py-2 text-sm font-semibold text-muted">
              Recent Exercises
            </h4>
            <div className="divide-y divide-hairline">
              {recent.map((e) => (
                <Row key={`recent-${e.name}`} e={e} />
              ))}
            </div>
          </section>
        )}

        {groups.length === 0 && (
          <p className="py-10 text-center text-muted">No exercises found.</p>
        )}

        {groups.map(([letter, items]) => (
          <section key={letter}>
            <h4 className="sticky top-0 bg-ink py-1.5 text-sm font-semibold text-faint">
              {letter}
            </h4>
            <div className="divide-y divide-hairline">
              {items.map((e) => (
                <Row key={e.name} e={e} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
