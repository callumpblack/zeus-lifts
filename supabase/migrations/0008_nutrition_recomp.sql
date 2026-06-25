-- ========================================================================
-- Zeus Lifts - Nutrition: add the "recomp" goal (lose fat & gain muscle).
--
-- Widens the nutrition_profiles.goal check constraint to allow 'recomp'
-- alongside the existing goals. Apply in the Supabase SQL editor. Idempotent.
-- ========================================================================

alter table nutrition_profiles
  drop constraint if exists nutrition_profiles_goal_check;

alter table nutrition_profiles
  add constraint nutrition_profiles_goal_check
  check (goal in ('lose', 'maintain', 'gain', 'recomp'));
