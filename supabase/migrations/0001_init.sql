-- ========================================================================
-- Zeus Lifts - initial schema + seed
-- Single-user personal app (no auth). Run this in the Supabase SQL editor.
-- ========================================================================

-- Routines ---------------------------------------------------------------
create table if not exists routines (
  id          text primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists routine_exercises (
  id             text primary key,
  routine_id     text not null references routines (id) on delete cascade,
  exercise_name  text not null,
  slug           text,
  primary_muscle text,
  equipment      text,
  sets           int  not null default 3,
  reps           text not null default '8-12',
  rest_seconds   int  not null default 90,
  "order"        int  not null default 0,
  mode           text not null default 'both'
                 check (mode in ('both', 'solo', 'with_friend'))
);
create index if not exists routine_exercises_routine_id_idx
  on routine_exercises (routine_id);

-- Workouts ---------------------------------------------------------------
create table if not exists workouts (
  id          text primary key,
  routine_id  text references routines (id) on delete set null,
  name        text not null default 'Workout',
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  notes       text default ''
);

create table if not exists workout_exercises (
  id            text primary key,
  workout_id    text not null references workouts (id) on delete cascade,
  exercise_name text not null,
  slug          text,
  notes         text default '',
  "order"       int not null default 0
);
create index if not exists workout_exercises_workout_id_idx
  on workout_exercises (workout_id);

create table if not exists workout_sets (
  id                  text primary key,
  workout_exercise_id text not null references workout_exercises (id) on delete cascade,
  set_number          int  not null,
  weight_kg           numeric,
  reps                int,
  completed           boolean not null default false,
  completed_at        timestamptz
);
create index if not exists workout_sets_we_id_idx
  on workout_sets (workout_exercise_id);

-- Row Level Security -----------------------------------------------------
-- Personal single-user app with no auth: access is open to the anon key.
-- (If you ever add auth, replace these with user-scoped policies.)
alter table routines          enable row level security;
alter table routine_exercises enable row level security;
alter table workouts          enable row level security;
alter table workout_exercises enable row level security;
alter table workout_sets      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['routines','routine_exercises','workouts','workout_exercises','workout_sets']
  loop
    execute format('drop policy if exists "public access" on %I', t);
    execute format('create policy "public access" on %I for all using (true) with check (true)', t);
  end loop;
end $$;


-- Seed: 4 pre-loaded Zeus routines (idempotent) -------------------------
insert into routines (id, name, created_at) values
  ('seed-push', 'Push — Chest & Shoulders', '2024-01-01T00:00:00Z'),
  ('seed-pull', 'Pull — Back & Biceps', '2024-01-01T00:00:00Z'),
  ('seed-legs', 'Legs', '2024-01-01T00:00:00Z'),
  ('seed-upper', 'Upper — Shoulders & Arms', '2024-01-01T00:00:00Z')
on conflict (id) do update set name = excluded.name;

insert into routine_exercises (id, routine_id, exercise_name, slug, primary_muscle, equipment, sets, reps, rest_seconds, "order", mode) values
  ('seed-push-ex-1', 'seed-push', 'Barbell Bench Press', 'Barbell_Bench_Press_-_Medium_Grip', 'Chest', 'Barbell', 4, '6-8', 180, 1, 'both'),
  ('seed-push-ex-2', 'seed-push', 'Incline Dumbbell Press', 'Incline_Dumbbell_Press', 'Chest', 'Dumbbell', 3, '10-12', 120, 2, 'both'),
  ('seed-push-ex-3', 'seed-push', 'Dumbbell Lateral Raise', 'Side_Lateral_Raise', 'Shoulders', 'Dumbbell', 4, '15-20', 90, 3, 'both'),
  ('seed-push-ex-4', 'seed-push', 'Overhead Press (Barbell)', 'Standing_Military_Press', 'Shoulders', 'Barbell', 3, '8-10', 120, 4, 'both'),
  ('seed-push-ex-5', 'seed-push', 'Seated Dumbbell Fly', 'Dumbbell_Flyes', 'Chest', 'Dumbbell', 3, '12-15', 60, 5, 'both'),
  ('seed-push-ex-6', 'seed-push', 'Rear Delt Fly (Cable)', 'Cable_Rear_Delt_Fly', 'Shoulders', 'Cable', 3, '15', 90, 6, 'solo'),
  ('seed-push-ex-7', 'seed-push', 'Overhead Tricep Extension (Cable)', 'Cable_Rope_Overhead_Triceps_Extension', 'Triceps', 'Cable', 3, '12', 60, 7, 'solo'),
  ('seed-pull-ex-1', 'seed-pull', 'Assisted Pull-Up', 'Band_Assisted_Pull-Up', 'Lats', 'Machine', 4, '6-8', 180, 1, 'both'),
  ('seed-pull-ex-2', 'seed-pull', 'Lat Pulldown (Cable)', 'Wide-Grip_Lat_Pulldown', 'Lats', 'Cable', 3, '10-12', 120, 2, 'both'),
  ('seed-pull-ex-3', 'seed-pull', 'Seated Cable Row (V-Grip)', 'Seated_Cable_Rows', 'Upper Back', 'Cable', 3, '10-12', 120, 3, 'both'),
  ('seed-pull-ex-4', 'seed-pull', 'Face Pull', 'Face_Pull', 'Shoulders', 'Cable', 3, '15-20', 90, 4, 'both'),
  ('seed-pull-ex-5', 'seed-pull', 'Preacher Curl (Barbell)', 'Preacher_Curl', 'Biceps', 'Barbell', 3, '8-10', 90, 5, 'both'),
  ('seed-pull-ex-6', 'seed-pull', 'Chest Supported Incline Row (Dumbbell)', 'Dumbbell_Incline_Row', 'Upper Back', 'Dumbbell', 3, '10-12', 90, 6, 'solo'),
  ('seed-pull-ex-7', 'seed-pull', 'Hammer Curl (Cable)', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Biceps', 'Cable', 3, '10-12', 60, 7, 'solo'),
  ('seed-legs-ex-1', 'seed-legs', 'Squat (Barbell)', 'Barbell_Full_Squat', 'Quadriceps', 'Barbell', 4, '6-8', 180, 1, 'both'),
  ('seed-legs-ex-2', 'seed-legs', 'Romanian Deadlift (Dumbbell)', 'Romanian_Deadlift', 'Hamstrings', 'Dumbbell', 3, '10-12', 120, 2, 'both'),
  ('seed-legs-ex-3', 'seed-legs', 'Leg Curl (Machine)', 'Lying_Leg_Curls', 'Hamstrings', 'Machine', 3, '12-15', 90, 3, 'both'),
  ('seed-legs-ex-4', 'seed-legs', 'Calf Raise (Machine)', 'Standing_Calf_Raises', 'Calves', 'Machine', 3, '15-20', 60, 4, 'both'),
  ('seed-legs-ex-5', 'seed-legs', 'Leg Press (Machine)', 'Leg_Press', 'Quadriceps', 'Machine', 3, '12-15', 90, 5, 'solo'),
  ('seed-legs-ex-6', 'seed-legs', 'Hanging Leg Raise', 'Hanging_Leg_Raise', 'Abs', 'Bodyweight', 3, '10-15', 60, 6, 'solo'),
  ('seed-upper-ex-1', 'seed-upper', 'Arnold Press (Dumbbell)', 'Arnold_Dumbbell_Press', 'Shoulders', 'Dumbbell', 4, '10-12', 150, 1, 'both'),
  ('seed-upper-ex-2', 'seed-upper', 'Dumbbell Lateral Raise', 'Side_Lateral_Raise', 'Shoulders', 'Dumbbell', 4, '15-20', 90, 2, 'both'),
  ('seed-upper-ex-3', 'seed-upper', 'Chest Dip (Assisted)', 'Dips_-_Chest_Version', 'Chest', 'Machine', 3, '8-10', 120, 3, 'both'),
  ('seed-upper-ex-4', 'seed-upper', 'Rear Delt Fly (Dumbbell)', 'Reverse_Flyes', 'Shoulders', 'Dumbbell', 3, '15', 90, 4, 'both'),
  ('seed-upper-ex-5', 'seed-upper', 'Triceps Rope Pushdown', 'Triceps_Pushdown_-_Rope_Attachment', 'Triceps', 'Cable', 3, '12-15', 60, 5, 'both'),
  ('seed-upper-ex-6', 'seed-upper', 'Incline Curl (Dumbbell)', 'Incline_Dumbbell_Curl', 'Biceps', 'Dumbbell', 3, '10-12', 60, 6, 'both'),
  ('seed-upper-ex-7', 'seed-upper', 'Skull Crusher (Barbell)', 'EZ-Bar_Skullcrusher', 'Triceps', 'Barbell', 3, '12', 90, 7, 'solo'),
  ('seed-upper-ex-8', 'seed-upper', 'Cable Chest Fly (Low to High)', 'Low_Cable_Crossover', 'Chest', 'Cable', 3, '12-15', 90, 8, 'solo'),
  ('seed-upper-ex-9', 'seed-upper', 'Hammer Curl (Cable)', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Biceps', 'Cable', 3, '10-12', 60, 9, 'solo')
on conflict (id) do nothing;
