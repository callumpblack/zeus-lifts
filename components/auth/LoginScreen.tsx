"use client";

import { useState } from "react";
import type { Persona } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import { saveProfile, seedZeusRoutinesSafely } from "@/lib/db";
import {
  cleanUsername,
  isValidPin,
  isValidUsername,
  setSigningUp,
  usernameToEmail,
} from "@/lib/auth";

interface Props {
  /** Re-check session + profile once we've finished signing in / up. */
  onAuthed: () => void;
}

type Mode = "signin" | "signup";

/** Username + 6-digit PIN login (Supabase password auth, no emails sent). */
export default function LoginScreen({ onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [persona, setPersona] = useState<Persona>("zeus");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || busy) return;

    if (!isValidUsername(username)) {
      setError("Username must be at least 2 letters/numbers.");
      return;
    }
    if (!isValidPin(pin)) {
      setError("PIN must be exactly 6 digits.");
      return;
    }

    setBusy(true);
    setError("");
    const email = usernameToEmail(username);

    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password: pin });
        if (error) {
          setError("Wrong username or PIN.");
          return;
        }
        onAuthed();
      } else {
        setSigningUp(true);
        const { data, error } = await sb.auth.signUp({ email, password: pin });
        if (error) {
          setError(
            /registered/i.test(error.message)
              ? "That username is taken."
              : error.message
          );
          return;
        }
        if (!data.session) {
          setError(
            "Sign-up needs email confirmation turned OFF in Supabase settings."
          );
          return;
        }
        await saveProfile({
          username: cleanUsername(username),
          persona,
          bodyweightKg: null,
          updatedAt: new Date().toISOString(),
        });
        if (persona === "zeus") await seedZeusRoutinesSafely();
        // Clear the sign-up guard BEFORE resolving — otherwise AuthGate's
        // resolve() ignores the auth event (it skips work mid sign-up) and
        // leaves the user stranded here instead of signing them in.
        setSigningUp(false);
        onAuthed();
      }
    } catch (err) {
      setError(
        (err as Error)?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSigningUp(false);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">
        Zeus <span className="text-accent">Lifts</span>
      </h1>
      <p className="mt-2 text-muted">
        {mode === "signin" ? "Sign in to track your lifts." : "Create your account."}
      </p>

      <form onSubmit={submit} className="mt-8 w-full space-y-3">
        <input
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full rounded-xl bg-elevated px-4 py-3 text-[15px] text-white placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="Username"
        />
        <input
          inputMode="numeric"
          type="password"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="6-digit PIN"
          className="w-full rounded-xl bg-elevated px-4 py-3 text-center text-[18px] tracking-[0.4em] text-white placeholder:tracking-normal placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="6-digit PIN"
        />

        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-2">
            {(["zeus", "hera"] as Persona[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPersona(p)}
                className={`rounded-xl py-3 text-sm font-semibold transition-colors ${
                  persona === p
                    ? "bg-accent text-ink"
                    : "bg-elevated text-white hover:bg-hairline"
                }`}
              >
                {p === "zeus" ? "⚡ Zeus" : "🌙 Hera"}
              </button>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent py-3.5 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-60"
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>

        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <button
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setError("");
        }}
        className="mt-6 text-sm font-medium text-accent hover:opacity-80"
      >
        {mode === "signin"
          ? "Need an account? Create one"
          : "Already have an account? Sign in"}
      </button>

      {mode === "signup" && (
        <p className="mt-3 text-xs text-faint">
          Zeus starts with the 4 routines · Hera starts blank
        </p>
      )}
    </div>
  );
}
