-- ========================================================================
-- Zeus Lifts - per-exercise toughness rating.
--
-- After a session the lifter rates how hard each exercise felt, 1 (easy) to
-- 10 (brutal). Stored on the workout_exercises row. Optional (nullable).
--
-- Apply in the Supabase SQL editor. Idempotent; safe to re-run.
-- Run this BEFORE deploying the matching app code, otherwise finishing a
-- workout (which writes `toughness`) and reading history will error on the
-- missing column.
-- ========================================================================

alter table workout_exercises
  add column if not exists toughness int
  check (toughness is null or toughness between 1 and 10);
