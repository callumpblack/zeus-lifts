"use client";

// Which nutrition profile is currently selected (e.g. Zeus vs Hera). Persisted
// per-browser in localStorage and broadcast via a window event so every mounted
// view (dashboard, header switcher, settings) stays in sync without a context
// provider spanning the separate route trees.

import { useEffect, useState } from "react";

const KEY = "zeus.nut.activeProfile";
const EVENT = "zeus:nut-profile-changed";

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setActiveProfileId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(KEY, id);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Reactive read of the active profile id; updates when it changes anywhere. */
export function useActiveProfileId(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(getActiveProfileId());
    const sync = () => setId(getActiveProfileId());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [id, setActiveProfileId];
}
