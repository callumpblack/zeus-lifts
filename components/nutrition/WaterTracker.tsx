"use client";

import { DropletIcon } from "./icons";

interface Props {
  consumedMl: number;
  targetMl: number;
  onAdd: (ml: number) => void;
  disabled?: boolean;
}

const QUICK = [250, 500, 750];

/** Water widget: a fill bar plus quick-add buttons. */
export default function WaterTracker({
  consumedMl,
  targetMl,
  onAdd,
  disabled,
}: Props) {
  const pct = targetMl > 0 ? Math.min((consumedMl / targetMl) * 100, 100) : 0;
  const litres = (consumedMl / 1000).toFixed(2);
  const targetL = (targetMl / 1000).toFixed(1);

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sky-400">
            <DropletIcon size={20} />
          </span>
          <h3 className="font-bold text-white">Water</h3>
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted">
          {litres}L{" "}
          <span className="font-normal text-faint">/ {targetL}L</span>
        </span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK.map((ml) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            disabled={disabled}
            className="rounded-xl bg-elevated py-2.5 text-sm font-semibold text-white transition-colors hover:bg-hairline disabled:opacity-50"
          >
            +{ml}ml
          </button>
        ))}
      </div>
    </section>
  );
}
