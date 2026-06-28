"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/format";
import { playRestDoneSound } from "@/lib/sound";
import { TimerIcon } from "./icons";

interface Props {
  /** Countdown length in seconds (from the routine's rest_seconds, or 60). */
  seconds: number;
  enabled: boolean;
  /** Epoch ms the countdown started; a new value restarts it from full. */
  startedAt?: number | null;
  onToggle: () => void;
}

/**
 * "Rest Timer: OFF" toggle. While enabled it counts down from `seconds`
 * (anchored to `startedAt` so it survives re-renders and tab throttling),
 * chimes once at zero, then auto-disables. Completing another set bumps
 * `startedAt`, which restarts the countdown.
 */
export default function RestTimer({
  seconds,
  enabled,
  startedAt,
  onToggle,
}: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  // Guards the chime/auto-off so they fire exactly once per countdown.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      clearInterval(tickRef.current);
      setRemaining(seconds);
      firedRef.current = false;
      return;
    }

    firedRef.current = false;
    const start = startedAt ?? Date.now();

    const update = () => {
      const left = Math.ceil(seconds - (Date.now() - start) / 1000);
      if (left <= 0) {
        clearInterval(tickRef.current);
        setRemaining(0);
        if (!firedRef.current) {
          firedRef.current = true;
          playRestDoneSound();
          onToggle(); // auto-off at zero
        }
        return;
      }
      setRemaining(left);
    };

    update();
    tickRef.current = setInterval(update, 250);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, startedAt, seconds]);

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-80"
    >
      <TimerIcon size={16} />
      <span>
        Rest Timer: {enabled ? formatCountdown(remaining) : "OFF"}
      </span>
    </button>
  );
}
