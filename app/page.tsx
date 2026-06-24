"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Routine } from "@/lib/types";
import { getRoutines } from "@/lib/db";
import BottomNav from "@/components/BottomNav";
import RoutineCard from "@/components/RoutineCard";
import ModuleToggle from "@/components/nutrition/ModuleToggle";
import {
  ChevronDownIcon,
  ClipboardIcon,
  PlusIcon,
} from "@/components/icons";

export default function HomePage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    setRoutines(await getRoutines());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pb-2 pt-5">
        <ModuleToggle />
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
          Zeus <span className="text-accent">Lifts</span>
        </h1>
      </header>

      <div className="px-4">
        {/* Start empty workout */}
        <button
          onClick={() => router.push("/workout/new")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-card py-3.5 font-semibold text-white transition-colors hover:bg-elevated"
        >
          <PlusIcon size={18} />
          Start Empty Workout
        </button>

        {/* Routines heading */}
        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Routines</h2>
          <Link
            href="/routines/new"
            aria-label="New routine"
            className="rounded-lg p-1.5 text-white transition-colors hover:bg-card"
          >
            <PlusIcon size={20} />
          </Link>
        </div>

        {/* New Routine sub-button */}
        <Link
          href="/routines/new"
          className="mt-3 flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 font-medium text-white transition-colors hover:bg-elevated"
        >
          <ClipboardIcon size={18} className="text-muted" />
          New Routine
        </Link>

        {/* My Routines (collapsible) */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-muted"
        >
          <ChevronDownIcon
            size={18}
            className={`transition-transform ${open ? "" : "-rotate-90"}`}
          />
          My Routines ({routines?.length ?? 0})
        </button>

        {open && (
          <div className="mt-3 space-y-3">
            {routines === null ? (
              <RoutineSkeletons />
            ) : routines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No routines yet. Tap “New Routine” to build one.
              </p>
            ) : (
              routines.map((r) => (
                <RoutineCard key={r.id} routine={r} onChanged={load} />
              ))
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function RoutineSkeletons() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-card p-4">
          <div className="h-4 w-1/2 rounded bg-elevated" />
          <div className="mt-3 h-3 w-3/4 rounded bg-elevated" />
          <div className="mt-4 h-10 w-full rounded-xl bg-elevated" />
        </div>
      ))}
    </>
  );
}
