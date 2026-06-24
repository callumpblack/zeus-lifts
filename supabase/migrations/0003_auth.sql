-- ========================================================================
-- Zeus Lifts - multi-user auth.
--
-- Adds per-user ownership and replaces the open "public access" policies with
-- Row-Level Security scoped to the logged-in user (auth.uid()). After this,
-- the database itself guarantees each person only sees their own data.
--
-- Apply in the Supabase SQL editor AFTER 0001 and 0002. Idempotent.
--
-- NOTE ON EXISTING DATA: rows created before auth have no owner, so they get
-- user_id = NULL and become invisible under the new policies (not deleted).
-- That's the intended "fresh start". To claim old rows for your own account,
-- after you've logged in once run e.g.:
--   update workouts set user_id = '<your-auth-uid>' where user_id is null;
-- (find your uid in Authentication → Users, or: select auth.uid();)
-- ========================================================================

-- 1) Owner column on each data table. The default stamps the current user on
--    insert, so the client never sends user_id and can't spoof it.
alter table routines          add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table routine_exercises add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table workouts          add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table workout_exercises add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table workout_sets      add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;

create index if not exists routines_user_idx on routines (user_id);
create index if not exists workouts_user_idx on workouts (user_id);

-- 2) Drop the old global seed routines — Zeus users now get their own cloned
--    copies on first login (with fresh ids), so these shared rows aren't needed.
delete from routine_exercises where routine_id like 'seed-%';
delete from routines          where id        like 'seed-%';

-- 3) Replace the open policies with owner-scoped ones on every data table.
do $$
declare t text;
begin
  foreach t in array array['routines','routine_exercises','workouts','workout_exercises','workout_sets']
  loop
    execute format('drop policy if exists "public access" on %I', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- 4) Profile: one row per user, keyed to the auth user, carrying persona.
--    The 0002 profile was a single 'me' row (text id); replace it.
drop table if exists profile;
create table profile (
  id            uuid primary key references auth.users (id) on delete cascade,
  persona       text check (persona in ('zeus', 'hera')),
  bodyweight_kg numeric,
  updated_at    timestamptz not null default now()
);
alter table profile enable row level security;
drop policy if exists "own profile" on profile;
create policy "own profile" on profile for all
  using (id = auth.uid()) with check (id = auth.uid());
