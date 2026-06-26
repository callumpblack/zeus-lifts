-- ========================================================================
-- Zeus Lifts - Nutrition: training-day calorie cycling (opt-in).
--
-- Adds a per-profile flag. When on, the daily target auto-adjusts from the
-- user's lifting load that day (rest day ↓, heavy/double day ↑). All logic is
-- client-side; this just persists the toggle. Apply in the Supabase SQL
-- editor. Idempotent.
-- ========================================================================

alter table nutrition_profiles
  add column if not exists calorie_cycling_enabled boolean not null default false;
