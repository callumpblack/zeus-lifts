"use client";

import { useEffect, useState } from "react";
import type { BodyWeightLog } from "@/lib/nutrition/types";
import { addBodyWeight, getBodyWeightLogs } from "@/lib/nutrition/db";
import { ScaleIcon } from "./icons";
import Sparkline from "./Sparkline";

interface Props {
  profileId: string;
  date: string;
  /** Notified after a successful log so the parent can refresh if needed. */
  onLogged?: (weightKg: number) => void;
}

/** Small card to log today's bodyweight, with a 7-reading mini sparkline. */
export default function BodyWeightCard({ profileId, date, onLogged }: Props) {
  const [logs, setLogs] = useState<BodyWeightLog[] | null>(null);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    let on = true;
    getBodyWeightLogs(profileId, 7).then((l) => {
      if (!on) return;
      setLogs(l);
      const todays = l.find((b) => b.loggedAt === date);
      if (todays) setValue(String(todays.weightKg));
    });
    return () => {
      on = false;
    };
  }, [profileId, date]);

  async function save() {
    const w = Number(value);
    if (!Number.isFinite(w) || w <= 0) return;
    setStatus("saving");
    await addBodyWeight(profileId, date, w);
    setLogs(await getBodyWeightLogs(profileId, 7));
    setStatus("saved");
    onLogged?.(w);
    setTimeout(() => setStatus("idle"), 1500);
  }

  const recent = logs ?? [];
  const last = recent.length ? recent[recent.length - 1].weightKg : null;

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent">
            <ScaleIcon size={20} />
          </span>
          <h3 className="font-bold text-white">Bodyweight</h3>
        </div>
        {recent.length >= 2 && (
          <Sparkline values={recent.map((b) => b.weightKg)} width={110} height={32} />
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-elevated px-3 py-2.5">
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={last != null ? `Last: ${last}` : "e.g. 80"}
            className="w-full bg-transparent text-[15px] text-white placeholder:text-faint focus:outline-none"
            aria-label="Today's bodyweight in kilograms"
          />
          <span className="shrink-0 text-sm font-medium text-muted">kg</span>
        </label>
        <button
          onClick={save}
          disabled={status === "saving" || value.trim() === ""}
          className="shrink-0 rounded-xl bg-accent px-5 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-50"
        >
          {status === "saving" ? "…" : status === "saved" ? "✓" : "Log"}
        </button>
      </div>
    </section>
  );
}
