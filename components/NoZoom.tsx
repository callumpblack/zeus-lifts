"use client";

import { useEffect } from "react";

/**
 * Suppresses pinch-zoom on touch devices. The viewport meta
 * (`maximum-scale=1, user-scalable=no`) plus `touch-action: manipulation`
 * handle double-tap zoom; iOS Safari still allows pinch gestures, so we cancel
 * the gesture* events and any multi-touch move here. Renders nothing.
 *
 * Note: deliberately no `touchend` double-tap hack — it would swallow rapid
 * legitimate taps (e.g. ticking set checkboxes quickly).
 */
export default function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();

    // iOS Safari pinch gestures.
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    document.addEventListener("gestureend", stop);

    // Multi-touch drags (pinch) on other browsers.
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}
