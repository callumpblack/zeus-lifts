"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/format";
import { TimerIcon } from "./icons";

interface Props {
  /** Countdown length in seconds (from the routine's rest_seconds, or 60). */
  seconds: number;
  enabled: boolean;
  onToggle: () => void;
}

/**
 * "Rest Timer: OFF" toggle. When enabled it counts down from `seconds`,
 * showing a live mm:ss, and auto-disables when it reaches zero.
 */
export default function RestTimer({ seconds, enabled, onToggle }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  // Start / stop the countdown whenever the toggle flips.
  useEffect(() => {
    if (!enabled) {
      clearInterval(tickRef.current);
      setRemaining(seconds);
      return;
    }
    setRemaining(seconds);
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tickRef.current);
          onToggle(); // auto-off at zero
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, seconds]);

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
