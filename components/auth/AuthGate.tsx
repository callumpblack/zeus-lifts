"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isSigningUp } from "@/lib/auth";
import { getProfile } from "@/lib/db";
import { getProfiles as getNutritionProfiles } from "@/lib/nutrition/db";
import LoginScreen from "./LoginScreen";
import PersonaPicker from "./PersonaPicker";
import ProfileSetup from "./ProfileSetup";

type Status =
  | "loading"
  | "signedOut"
  | "needPersona"
  | "needProfile"
  | "ready";

/**
 * Gates the whole app behind Supabase Auth when it's configured:
 *   no session    → magic-link login
 *   no persona    → first-login Zeus/Hera picker
 *   otherwise     → the app (data is RLS-scoped to the user)
 *
 * When Supabase isn't configured, it's a no-op so local/dev mode is unchanged.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(
    isSupabaseConfigured ? "loading" : "ready"
  );

  // Re-check the current session + profile and pick the right screen.
  const resolve = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    // Ignore the intermediate auth events fired mid sign-up; the sign-up
    // handler calls resolve() itself once the profile is fully written.
    if (isSigningUp()) return;
    try {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        setStatus("signedOut");
        return;
      }
      const profile = await getProfile();
      if (!profile.persona) {
        setStatus("needPersona");
        return;
      }
      // One shared profile: require the full (nutrition-backed) profile before
      // entering either section, so lifting and nutrition work from the same
      // data. Also catches existing accounts that predate this step.
      const nutritionProfiles = await getNutritionProfiles();
      setStatus(nutritionProfiles.length === 0 ? "needProfile" : "ready");
    } catch {
      // A failed/stalled session or profile read must not strand the user on
      // the loading spinner — drop to login so a fresh sign-in recovers.
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    if (!sb) return;
    resolve();
    // Never sit on the loading spinner for more than a few seconds: fall back
    // to the login screen if we haven't resolved. (getSession reads the cached
    // session, so the normal path settles in well under a second.)
    const timeout = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "signedOut" : s));
    }, 5000);
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      // Defer out of the auth-state-change callback. Calling getSession() or a
      // DB read synchronously inside it can deadlock supabase-js's lock, which
      // shows up as a permanent "Loading…" screen.
      setTimeout(() => resolve(), 0);
    });
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [resolve]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </div>
    );
  }
  if (status === "signedOut") return <LoginScreen onAuthed={resolve} />;
  if (status === "needPersona") {
    return <PersonaPicker onDone={resolve} />;
  }
  if (status === "needProfile") {
    return <ProfileSetup onDone={resolve} />;
  }
  return <>{children}</>;
}
