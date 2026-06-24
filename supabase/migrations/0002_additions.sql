-- ========================================================================
-- Zeus Lifts - additions: assisted exercises, drop sets, supersets,
-- finish-screen animal, and a single-user profile (bodyweight).
-- Idempotent; safe to re-run. Apply in the Supabase SQL editor.
-- ========================================================================

-- Assisted load + drop-set parent on individual sets ---------------------
alter table workout_sets add column if not exists assistance_kg numeric;
alter table workout_sets add column if not exists parent_set_id text
  references workout_sets (id) on delete cascade deferrable initially deferred;
create index if not exists workout_sets_parent_idx
  on workout_sets (parent_set_id);

-- Assisted flag + superset grouping on workout exercises -----------------
alter table workout_exercises add column if not exists requires_bodyweight boolean not null default false;
alter table workout_exercises add column if not exists superset_group text;

-- Celebratory animal saved with the workout ------------------------------
alter table workouts add column if not exists animal_name  text;
alter table workouts add column if not exists animal_emoji text;

-- Single-user profile (bodyweight for assisted exercises) ----------------
create table if not exists profile (
  id            text primary key default 'me',
  bodyweight_kg numeric,
  updated_at    timestamptz not null default now()
);
alter table profile enable row level security;
drop policy if exists "public access" on profile;
create policy "public access" on profile for all using (true) with check (true);
