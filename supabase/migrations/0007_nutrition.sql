-- ========================================================================
-- Zeus Lifts - Nutrition Tracker.
--
-- A second first-class module living in the same project/auth as the lifting
-- tracker. Tables follow the 0003 ownership pattern: user_id defaults to
-- auth.uid() on insert (so the client never sends it and can't spoof it), and
-- every table is RLS-scoped to its owner.
--
-- One auth user can own multiple nutrition_profiles (e.g. Zeus + Hera); all
-- food / water / body-weight logs are scoped to both user_id AND profile_id.
--
-- Apply in the Supabase SQL editor AFTER 0001-0006. Idempotent.
-- ========================================================================

-- 1) Profiles: macro targets + the inputs they were calculated from. --------
create table if not exists nutrition_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label            text not null,                       -- "Zeus", "Hera", …
  sex              text not null check (sex in ('male', 'female')),
  date_of_birth    date not null,
  weight_kg        numeric(5,2) not null,
  height_cm        numeric(5,2) not null,
  activity_level   numeric(4,3) not null,
  goal             text not null check (goal in ('lose', 'maintain', 'gain')),
  target_weight_kg numeric(5,2),
  goal_deadline    date,
  target_calories  integer not null,
  target_protein_g integer not null,
  target_fat_g     integer not null,
  target_carbs_g   integer not null,
  water_target_ml  integer not null default 2500,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists nutrition_profiles_user_idx
  on nutrition_profiles (user_id);

-- 2) Food logs: one row per logged food, scoped to a profile + day. ---------
create table if not exists food_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id         uuid not null references nutrition_profiles (id) on delete cascade,
  logged_at          date not null default current_date,
  meal_type          text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name          text not null,
  brand              text,
  serving_size_g     numeric(7,2),
  calories           numeric(7,2),
  protein_g          numeric(7,2),
  fat_g              numeric(7,2),
  carbs_g            numeric(7,2),
  fibre_g            numeric(7,2),
  sugar_g            numeric(7,2),
  open_food_facts_id text,                               -- barcode / product id
  created_at         timestamptz not null default now()
);
create index if not exists food_logs_profile_day_idx
  on food_logs (profile_id, logged_at);

-- 3) Body-weight logs. ------------------------------------------------------
create table if not exists body_weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null references nutrition_profiles (id) on delete cascade,
  logged_at  date not null default current_date,
  weight_kg  numeric(5,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists body_weight_logs_profile_day_idx
  on body_weight_logs (profile_id, logged_at);

-- 4) Water logs. ------------------------------------------------------------
create table if not exists water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null references nutrition_profiles (id) on delete cascade,
  logged_at  date not null default current_date,
  amount_ml  integer not null,
  created_at timestamptz not null default now()
);
create index if not exists water_logs_profile_day_idx
  on water_logs (profile_id, logged_at);

-- 5) RLS: each table is owner-scoped to auth.uid(). -------------------------
alter table nutrition_profiles enable row level security;
alter table food_logs          enable row level security;
alter table body_weight_logs   enable row level security;
alter table water_logs         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['nutrition_profiles','food_logs','body_weight_logs','water_logs']
  loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
