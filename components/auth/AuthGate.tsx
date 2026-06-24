"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
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

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    if (!sb) return;
    let active = true;

    async function resolve(session: Session | null) {
      if (!session) {
        if (active) setStatus("signedOut");
        return;
      }
      const profile = await getProfile();
      if (!active) return;
      setStatus(profile.persona ? "ready" : "needPersona");
    }

    sb.auth.getSession().then(({ data }) => resolve(data.session));
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => resolve(session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </div>
    );
  }
  if (status === "signedOut") return <LoginScreen />;
  if (status === "needPersona") {
    return <PersonaPicker onDone={() => setStatus("ready")} />;
  }
  return <>{children}</>;
}
