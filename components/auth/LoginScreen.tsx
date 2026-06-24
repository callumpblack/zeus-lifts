"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

/** Email magic-link sign-in. Shown by AuthGate when there's no session. */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !email.trim()) return;
    setStatus("sending");
    setError("");
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">
        Zeus <span className="text-accent">Lifts</span>
      </h1>

      {status === "sent" ? (
        <div className="mt-8 w-full rounded-2xl bg-card p-6">
          <div className="text-4xl" aria-hidden>
            📬
          </div>
          <p className="mt-3 font-semibold text-white">Check your email</p>
          <p className="mt-1 text-sm text-muted">
            We sent a sign-in link to {email}. Open it on this device to log in.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-4 text-sm font-medium text-accent hover:opacity-80"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendLink} className="mt-8 w-full">
          <p className="mb-4 text-muted">Sign in to track your lifts.</p>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-elevated px-4 py-3 text-[15px] text-white placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Email address"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-3 w-full rounded-xl bg-accent py-3.5 font-semibold text-ink transition-colors hover:bg-accent-dim disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {status === "error" && (
            <p className="mt-3 text-sm text-danger">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
