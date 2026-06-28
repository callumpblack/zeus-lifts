"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { MuscleVolume } from "@/lib/muscle-groups";

interface Props {
  data: MuscleVolume[];
}

/**
 * Doughnut of training volume by primary muscle for a finished workout, with a
 * legend listing each muscle's share (%) and exact kg. Colours come from the
 * shared muscle palette so they stay consistent with the rest of the app.
 */
export default function MuscleBreakdownChart({ data }: Props) {
  if (data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.kg, 0);

  return (
    <div className="w-full">
      <div className="relative mx-auto h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="kg"
              nameKey="muscle"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={700}
              isAnimationActive
            >
              {data.map((d) => (
                <Cell key={d.muscle} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Centre total */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold text-white">
            {total.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted">kg total</div>
        </div>
      </div>

      {/* Legend: exact kg + share per muscle */}
      <ul className="mt-4 space-y-2">
        {data.map((d) => (
          <li key={d.muscle} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="flex-1 truncate font-medium text-white">
              {d.muscle}
            </span>
            <span className="tabular-nums font-semibold text-white">
              {Math.round(d.pct)}%
            </span>
            <span className="w-20 text-right tabular-nums text-muted">
              {d.kg.toLocaleString()} kg
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
