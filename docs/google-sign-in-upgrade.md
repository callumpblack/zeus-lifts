# Planned upgrade: Google sign-in

**Status:** Deferred (not urgent). Captured for a future date.
**Owner:** Callum
**Last updated:** 2026-06-24

---

## Goal

Let users sign in with Google in addition to the current username + 6-digit PIN
login — **without losing the data already attached to existing PIN accounts**
(Zeus / Hera, plus their workouts and nutrition logs).

## Why this is low-risk

The app is already **identity-provider-agnostic**. Every data table is RLS-scoped
to `auth.uid()` and `user_id` defaults to `auth.uid()` on insert, so nothing in
the data layer cares *how* a user authenticated. The only things tied to
username+PIN are:

- the login UI ([components/auth/LoginScreen.tsx](../components/auth/LoginScreen.tsx)), and
- the synthetic-email convention `<username>@zeuslifts.app` ([lib/auth.ts](../lib/auth.ts)).

So Google sign-in is **additive** — a button plus provider config — and requires
**no schema changes**. `detectSessionInUrl: true` is already set in
[lib/supabase.ts](../lib/supabase.ts), which is exactly what the OAuth redirect
needs, and [AuthGate](../components/auth/AuthGate.tsx) already routes a
brand-new user (no persona) to the persona picker.

## The core problem: account mapping

Existing accounts authenticate as a **fake email** (e.g. `callum@zeuslifts.app`)
with the PIN as the password. Google sign-in presents the user's **real Gmail**
(`callumpblack@gmail.com`) — a *different identity*. By default Supabase will:

> create a **brand-new `auth.users` row with a new `auth.uid()`**

Because all of Callum's data is RLS-scoped to his **old** uid, he would land in
an empty app with his data orphaned. Therefore we must **link** the Google
identity to the existing user — not just "add Google".

---

## Recommended approach: link, don't create (no data migration)

Supabase can attach a second identity to an **already signed-in** user via
`auth.linkIdentity({ provider: 'google' })`. This keeps the **same uid**, so
every workout/nutrition row stays owned by the same account — zero migration.

### One-time per existing user
1. User signs in **once** with their existing username + PIN.
2. In Profile/Settings they tap **"Connect Google"** → `linkIdentity(...)`.
3. Supabase attaches the Google identity to the **same `auth.users` row**.
4. From then on, Google sign-in resolves to that same account.

### Brand-new users (Google-first)
They simply get a fresh uid and hit the existing persona picker — already
handled. A username is optional; `profile.username` is nullable and the unique
index allows multiple NULLs (see [0006_callum_username.sql](../supabase/migrations/0006_callum_username.sql)).

---

## Implementation checklist (for when we build it)

### 1. Google Cloud Console
- Create an **OAuth 2.0 Client ID** (type: Web application).
- **Authorized redirect URI:** `https://<project-ref>.supabase.co/auth/v1/callback`
- Configure the OAuth consent screen (app name, support email, scopes: email + profile).

### 2. Supabase dashboard
- **Authentication → Providers → Google:** enable, paste the Client ID + Secret.
- **Authentication → URL Configuration:** ensure Site URL + additional Redirect
  URLs include both production and `http://localhost:3000` (for local dev).
- **Enable manual identity linking** (Authentication settings) — required for
  `linkIdentity` to work.
- Keep **"Confirm email" OFF** (already required for PIN signup; unchanged).

### 3. App code
- **Login screen:** add a "Sign in with Google" button:
  ```ts
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }, // back to the app
  });
  ```
- **Profile/Settings:** add a "Connect Google" action (only meaningful while
  signed in):
  ```ts
  await supabase.auth.linkIdentity({ provider: "google" });
  ```
- No changes needed to the data layer, RLS, or the nutrition module.

### 4. Test matrix
- [ ] Existing PIN user → sign in → Connect Google → sign out → sign in with
      Google → **all old data present** (same uid).
- [ ] New user via Google → lands on persona picker → normal onboarding.
- [ ] Both lifting and nutrition data remain correctly scoped after linking.
- [ ] PIN login still works unchanged for anyone who never links Google.

---

## Fallback: re-point data if an account already diverged

If someone signs in with Google **before** linking (creating a separate new
uid), migrate their rows from the old uid to the new one with a one-off SQL
update — the same pattern as
[0004_claim_callum.sql](../supabase/migrations/0004_claim_callum.sql):

```sql
-- Re-point every owned table from OLD_UID to NEW_UID, then remove the stray user.
update routines          set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update routine_exercises set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update workouts          set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update workout_exercises set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update workout_sets      set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update nutrition_profiles set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update food_logs          set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update body_weight_logs   set user_id = 'NEW_UID' where user_id = 'OLD_UID';
update water_logs         set user_id = 'NEW_UID' where user_id = 'OLD_UID';
-- profile is keyed by id = uid, so it must be re-created under NEW_UID
-- (or just re-pick the persona on the new account).
```

> Prefer the `linkIdentity` path — it avoids all of this.

## Edge cases / gotchas

- **Google email already used by another `auth.users` row** → linking fails.
  Resolve the duplicate first.
- **Manual linking must be enabled**, or `linkIdentity` errors out.
- **Per-environment redirect URLs** — add localhost *and* the production URL, or
  OAuth round-trips break in one of them.
- Avoid relying on Supabase's automatic "link by same email" — it has security
  caveats; explicit `linkIdentity` while signed in is the controlled path.

## Decision record

Not urgent. PIN auth is a complete system. Because everything is `auth.uid()`-
scoped and `linkIdentity` preserves the uid, the difficulty of adding Google
**does not grow over time**. Build it when PIN entry becomes friction. Until
then: only log real data under the accounts you intend to keep (don't pour
real logging into a throwaway test account), and the linking question never
comes up.
