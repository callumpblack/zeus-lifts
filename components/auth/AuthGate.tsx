"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isSigningUp } from "@/lib/auth";
import { getProfile } from "@/lib/db";
import LoginScreen from "./LoginScreen";
import PersonaPicker from "./PersonaPicker";

type Status = "loading" | "signedOut" | "needPersona" | "ready";

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
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) {
      setStatus("signedOut");
      return;
    }
    const profile = await getProfile();
    setStatus(profile.persona ? "ready" : "needPersona");
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    if (!sb) return;
    resolve();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => resolve());
    return () => subscription.unsubscribe();
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
  return <>{children}</>;
}
