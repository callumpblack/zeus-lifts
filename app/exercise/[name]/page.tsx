"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getExerciseDetail, equipmentLabel, titleCase } from "@/lib/exercises";
import { muscleColor } from "@/lib/muscle-groups";
import ExerciseImage from "@/components/ExerciseImage";
import { CloseIcon } from "@/components/icons";

// Spec calls for the exercise name in blue; this matches the "Lats" blue from
// the shared muscle palette so it stays in-palette with the rest of the app.
const NAME_BLUE = "#3B82F6";

/**
 * Exercise detail modal at /exercise/[name]. Opens over the current screen when
 * an exercise photo is tapped. Close via the X, tapping the dimmed backdrop,
 * Escape, or swiping the card down.
 */
export default function ExerciseDetailPage() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(
    Array.isArray(params.name) ? params.name[0] : params.name ?? ""
  );
  const detail = getExerciseDetail(name);

  const close = () => router.back();

  // Escape to close + scroll lock while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe-down-to-dismiss for the card.
  const touchStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - touchStartY.current));
  };
  const onTouchEnd = () => {
    if (dragY > 110) close();
    setDragY(0);
    touchStartY.current = null;
  };

  const secondaries = detail?.secondaryMuscles ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/75 px-5"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
        className="relative w-full max-w-[360px] animate-slide-up rounded-3xl border border-hairline bg-card px-6 pb-7 pt-14 text-center shadow-2xl"
      >
        {/* Close (X) top-left */}
        <button
          onClick={close}
          aria-label="Close"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-muted transition-colors hover:text-white"
        >
          <CloseIcon size={20} />
        </button>

        {detail ? (
          <>
            {/* Large circular animated image */}
            <div className="mx-auto">
              <ExerciseImage
                name={detail.name}
                slug={detail.slug}
                alt={detail.name}
                size={188}
                className="mx-auto ring-1 ring-hairline"
              />
            </div>

            {/* Name in blue */}
            <h1
              className="mt-5 text-2xl font-bold leading-tight"
              style={{ color: NAME_BLUE }}
            >
              {detail.name}
            </h1>

            {/* Muscles */}
            <div className="mt-5 space-y-3 text-left">
              <MuscleRow
                label="Primary"
                items={[detail.primaryMuscle].filter(Boolean)}
                colored
              />
              {secondaries.length > 0 && (
                <MuscleRow
                  label="Secondary"
                  items={secondaries.map(titleCase)}
                />
              )}
              {detail.equipment && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                    Equipment
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {equipmentLabel(detail.equipment)}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-10">
            <ExerciseImage slug={null} alt={name} size={96} className="mx-auto" />
            <h1 className="mt-5 text-xl font-bold text-white">{name}</h1>
            <p className="mt-2 text-sm text-muted">
              No details available for this exercise yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MuscleRow({
  label,
  items,
  colored = false,
}: {
  label: string;
  items: string[];
  colored?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1 text-sm font-medium text-white"
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colored ? muscleColor(m) : "#5B6675" }}
            />
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
