"use client";

import { useState } from "react";
import { imageUrl } from "@/lib/exercises";
import { DumbbellIcon } from "./icons";

interface Props {
  slug: string | null;
  alt: string;
  size?: number; // px diameter
  className?: string;
}

/**
 * Circular exercise thumbnail pulled from the wrkout/exercises.json repo.
 * Falls back to a grey circle with a dumbbell glyph when there is no slug or
 * the image 404s.
 */
export default function ExerciseImage({ slug, alt, size = 48, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(slug, 0);
  const showFallback = !src || failed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-elevated ${className}`}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
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
          onError={() => setFailed(true)}
          className="h-full w-full bg-white object-cover"
        />
      )}
    </div>
  );
}
