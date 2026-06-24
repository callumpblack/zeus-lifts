-- ========================================================================
-- Zeus Lifts - username for PIN login.
--
-- Login moves to username + 6-digit PIN, backed by Supabase password auth
-- (each username maps to a synthetic email <username>@zeuslifts.app). This
-- stores the chosen username on the profile for display + uniqueness.
--
-- Apply in the Supabase SQL editor after 0003. Idempotent.
--
-- ALSO REQUIRED (dashboard, not SQL):
--   Authentication → Providers → Email → turn OFF "Confirm email"
--   Authentication → Sign In / Providers → ensure new sign-ups are allowed
-- so password sign-up creates accounts instantly without sending email.
-- ========================================================================

alter table profile add column if not exists username text;

-- Case-insensitive uniqueness (multiple NULLs are allowed).
create unique index if not exists profile_username_key
  on profile (lower(username));
