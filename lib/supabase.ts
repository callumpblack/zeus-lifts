import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase is optional: when env vars are present the app persists to Postgres;
// otherwise the data layer transparently falls back to localStorage so the app
// is fully usable out of the box (see lib/db.ts).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}
