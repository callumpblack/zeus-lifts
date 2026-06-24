-- ========================================================================
-- Zeus Lifts - one-off: migrate Callum from magic-link (gmail) to a username.
--
-- His account keeps the same user_id, so ALL his data (the claimed workout,
-- routines, persona) stays intact — only the login identifier changes from
-- callumpblack@gmail.com to the username convention callum@zeuslifts.app.
--
-- RUN ORDER:
--   1. Apply 0005_pin_auth.sql.
--   2. Deploy the PIN-login app. Callum is still logged in, so on the Profile
--      page he sets his PIN ("Change PIN" → 6 digits). (No email involved.)
--   3. Run THIS script.
--   4. From then on he signs in with username "callum" + that PIN.
--
-- Idempotent.
-- ========================================================================

update auth.users
set email = 'callum@zeuslifts.app',
    email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = 'callumpblack@gmail.com';

update profile
set username = 'callum'
where id = (
  select id from auth.users where lower(email) = 'callum@zeuslifts.app'
);
