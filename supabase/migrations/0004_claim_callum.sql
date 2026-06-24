-- ========================================================================
-- Zeus Lifts - one-off: claim all pre-auth data for Callum.
--
-- Pre-auth rows (created before 0003) have user_id = NULL and are invisible
-- under RLS. This assigns every orphaned row to Callum's account so his first
-- workout shows up in his History.
--
-- RUN ORDER:
--   1. Apply 0003_auth.sql.
--   2. Callum signs in once with callumpblack@gmail.com via the magic link
--      (this creates his auth.users row). Pick a persona.
--   3. Run THIS script in the Supabase SQL editor.
--
-- Idempotent: only touches rows that are still unclaimed (user_id is null).
-- ========================================================================

do $$
declare
  uid uuid;
begin
  select id into uid
  from auth.users
  where lower(email) = lower('callumpblack@gmail.com')
  limit 1;

  if uid is null then
    raise exception
      'No auth user for callumpblack@gmail.com yet — have Callum sign in once first, then re-run.';
  end if;

  update routines          set user_id = uid where user_id is null;
  update routine_exercises set user_id = uid where user_id is null;
  update workouts          set user_id = uid where user_id is null;
  update workout_exercises set user_id = uid where user_id is null;
  update workout_sets      set user_id = uid where user_id is null;

  raise notice 'Claimed all orphaned rows for % (uid %)', 'callumpblack@gmail.com', uid;
end $$;
