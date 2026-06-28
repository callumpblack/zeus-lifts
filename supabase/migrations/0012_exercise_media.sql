-- ========================================================================
-- Zeus Lifts - exercise media + body-part denormalization
-- Run this in the Supabase SQL editor. Idempotent.
--
-- Adds:
--   1. workout_exercises.body_part  — denormalized primary muscle group, written
--      at save time for fast volume-by-muscle charts (workout finish screen,
--      history, stats) without re-deriving from the exercise library.
--   2. exercises_cache              — optional mirror of the curated exercise
--      library + animated-GIF data (from the hasaneyldrm/exercises dataset) for
--      fast server-side lookups. The app reads embedded JSON, so this table is
--      purely a convenience; it is populated best-effort on app load.
-- ========================================================================

-- 1. Denormalized primary muscle group on each logged exercise -----------
alter table workout_exercises
  add column if not exists body_part text;

-- 2. Optional exercise cache --------------------------------------------
create table if not exists exercises_cache (
  id         text primary key,        -- dataset id (e.g. "0025")
  name       text not null,           -- canonical app display name
  equipment  text,
  body_part  text,                    -- primary muscle group
  target     text,                    -- dataset target muscle
  gif_url    text
);
create index if not exists exercises_cache_name_idx
  on exercises_cache (name);

-- Row Level Security: same open "public access" model as the rest of the app
-- (single-user, no auth). Replace with user-scoped policies if auth is added.
alter table exercises_cache enable row level security;

do $$
begin
  drop policy if exists "public access" on exercises_cache;
  create policy "public access" on exercises_cache
    for all using (true) with check (true);
end $$;
