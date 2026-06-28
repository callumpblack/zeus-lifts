"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { gifUrlFor, imageUrl } from "@/lib/exercises";
import { DumbbellIcon } from "./icons";

interface Props {
  slug: string | null;
  alt: string;
  /** Canonical exercise name — enables the animated GIF and detail link. */
  name?: string;
  size?: number; // px diameter
  className?: string;
  /** When true, tapping opens /exercise/[name] (requires `name`). */
  link?: boolean;
}

/**
 * Circular exercise thumbnail. Prefers the animated GIF from the exercises
 * dataset, falls back to the static wrkout photo, then to a grey circle with a
 * dumbbell glyph. When `link` is set it navigates to the exercise detail modal.
 */
export default function ExerciseImage({
  slug,
  alt,
  name,
  size = 48,
  className = "",
  link = false,
}: Props) {
  // Ordered candidate sources: animated gif first, then static photo.
  const sources = useMemo(
    () => [gifUrlFor(name), imageUrl(slug, 0)].filter((s): s is string => Boolean(s)),
    [name, slug]
  );
  const [srcIndex, setSrcIndex] = useState(0);
  const src = sources[srcIndex] ?? null;
  const showFallback = !src;

  const inner = showFallback ? (
    <div className="flex h-full w-full items-center justify-center text-faint">
      <DumbbellIcon size={Math.round(size * 0.5)} />
    </div>
  ) : (
    // Plain img keeps remote-error fallback simple and avoids loader config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setSrcIndex((i) => i + 1)}
      className="h-full w-full bg-white object-cover"
    />
  );

  const base = `relative shrink-0 overflow-hidden rounded-full bg-elevated ${className}`;

  if (link && name) {
    return (
      <Link
        href={`/exercise/${encodeURIComponent(name)}`}
        aria-label={`View ${alt}`}
        onClick={(e) => e.stopPropagation()}
        className={`${base} block cursor-pointer transition-opacity active:opacity-80`}
        style={{ width: size, height: size }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={base} style={{ width: size, height: size }}>
      {inner}
    </div>
  );
}
