# Nutrition module — context & spec

The single source of truth for the nutrition tracker. Read this to understand
how it works; **edit it to tell Claude how you want it to work.** If you change a
rule here (e.g. a macro constant), say "apply the nutrition.md changes" and it'll
be implemented to match.

Last updated: 2026-06-25

---

## What it is

A nutrition/macro tracker that lives inside Zeus Lifts as a second first-class
section, reached via the **Lifting / Nutrition** pill at the top of the main
screens. It shares the same app, the same Supabase project, and the same login.
The nutrition system is **fully generic** — it calculates targets dynamically
from each user's profile. No targets are hardcoded.

## How the two sections fit together

- **Shared login** — username + 6-digit PIN (Supabase auth). One account.
- **Unified onboarding** — first login is `sign in → pick profile → fill ONE
  profile`. That single profile powers both sections: nutrition gets the macro
  targets, and the profile's weight syncs into the lifting bodyweight.
- **One profile per login** (the household multi-profile switcher still exists in
  Nutrition → Settings but is hidden unless you add a second one).

## Routes

| Route | Purpose |
|---|---|
| `/nutrition` | Daily dashboard — macro rings, meals, water, bodyweight |
| `/nutrition/search` | Food search (Open Food Facts) + add-to-log |
| `/nutrition/log/[date]` | View/edit any past day |
| `/nutrition/history` | Week / month / all-time stats + charts |
| `/nutrition/settings` | View/edit profile, recalculate, water target, profiles |

## Code map

```
lib/nutrition/
  types.ts          Domain types, MEAL_TYPES, ACTIVITY_LEVELS
  macros.ts         THE MACRO CALCULATOR (formulas + tunable constants)  ← edit here
  db.ts             Data layer (Supabase + localStorage fallback) + integration hooks
  openfoodfacts.ts  Food search client
  dates.ts  stats.ts  active-profile.ts
components/nutrition/  Rings, charts, meal sections, water, bodyweight, onboarding, …
app/nutrition/         The 5 routes above
supabase/migrations/   0007 (tables + RLS), 0008 (recomp goal)
```

## Data model (Supabase, RLS-scoped to `auth.uid()`)

- `nutrition_profiles` — the profile + calculated targets (one per person)
- `food_logs` — one row per logged food, scoped to profile + day
- `body_weight_logs`, `water_logs`

All created by migration `0007_nutrition.sql`; the `recomp` goal needs
`0008_nutrition_recomp.sql`.

---

## The macro calculator  ← the part you're most likely to tune

All of this lives in [`lib/nutrition/macros.ts`](../lib/nutrition/macros.ts).
Change a number here and tell Claude to apply it.

**1. BMR** (Mifflin-St Jeor):
`(10 × kg) + (6.25 × cm) − (5 × age)` then `+5` (male) / `−161` (female).

**2. TDEE** = BMR × activity multiplier:

| Activity level | Multiplier | Who it fits |
|---|---|---|
| Sedentary | 1.2 | Desk job, little movement outside exercise |
| Lightly active | 1.375 | 1–3 training sessions/week |
| Moderately active | 1.55 | 3–5 sessions/week |
| Very active | 1.725 | 6–7 hard sessions/week |
| Athlete | 1.9 | Twice-daily training or physical job + training |

**3. Calorie target** (by goal):

| Goal | Calories |
|---|---|
| Lose fat | TDEE − deficit |
| Maintain | TDEE |
| Gain muscle | TDEE + **300** (`GAIN_SURPLUS`) |
| Lose fat & gain muscle (recomp) | TDEE (maintenance) |

Deficit (lose) = weekly-kg-pace × 7700 / 7, **capped at 750 kcal/day**
(`MAX_DAILY_DEFICIT`). With no target weight/deadline it assumes **0.5 kg/week**.

A **calorie floor** is enforced to prevent unsafe targets:
- Men: never below **1,500 kcal/day**
- Women: never below **1,200 kcal/day**

If the calculated target falls below the floor, cap it there and surface a
warning in the UI.

**4. Macro split** (the tunable constants):

| Constant | Value | Rationale |
|---|---|---|
| `PROTEIN_PER_LB.lose` | **1.0 g/lb** | Higher end — protects muscle in a deficit |
| `PROTEIN_PER_LB.recomp` | **1.0 g/lb** | Same — recomp demands high protein |
| `PROTEIN_PER_LB.maintain` | **0.82 g/lb** | Standard maintenance target |
| `PROTEIN_PER_LB.gain` | **0.9 g/lb** | Slightly elevated for muscle synthesis |
| `FAT_MINIMUM_PER_LB` | **0.35 g/lb** | Hard floor for hormonal health |
| `FAT_CALORIE_SHARE` | **0.25** | 25% of total calories; used if above the minimum |
| Carbs | remainder | calories − protein·4 − fat·9, ÷4 |

**How fat is calculated:** take the higher of `FAT_MINIMUM_PER_LB × bodyweight`
and `FAT_CALORIE_SHARE × target_calories`. This ensures the minimum is always
hit, and heavier users at higher calorie targets get a proportional fat allocation.

Carbs fill whatever calories remain after protein and fat are accounted for.
If carbs calculate to below 50 g, surface a warning — this is uncomfortably low
for most people and may indicate the calorie target itself is too aggressive.

**5. Training day calorie cycling (optional feature):**

Users who train can optionally enable calorie cycling. When enabled:
- **Training days:** standard target calories
- **Rest days:** target calories − 150 to 200 kcal (reduce carbs only, keep protein
  and fat fixed)
- **High-activity days** (multiple sessions or session + sport): target calories
  + 300 to 500 kcal (increase carbs)

This is opt-in at the profile level (`calorie_cycling_enabled: boolean`). Default off.

**6. Shared meal mode (optional feature):**

When two profiles are active in a household and share meals, each profile can
specify a **meal split ratio** (e.g. 60/40 or 50/50 by weight). When logging a
shared meal, the app divides the total food weight and macros between the two
profiles according to their ratio. Each profile's log receives only its own
share. The split is configurable per profile in Settings.

---

## Water target

Default: **35 ml per kg of bodyweight**, rounded to nearest 100 ml.
Minimum shown to user: 2,000 ml. Maximum default cap: 4,000 ml.
User can override manually in Settings.

---

## Conventions (match these when extending)

- **Client components + a data layer** (not server components). Every read/write
  goes through `lib/nutrition/db.ts`, which uses Supabase when configured and
  falls back to `localStorage` otherwise.
- **Theme:** emerald `#10B981` accent, `ink/card/elevated` surfaces, Outfit font.
- **Charts:** hand-rolled inline SVG (no Recharts). **Dates:** native (no date-fns).
- **No `any`** in new code where avoidable; keep TypeScript strict.
- Weights in **kg**, liquids in **ml**.

## Integration hooks (for a future unified dashboard)

`getTodayNutritionSummary(userId, profileId)` and
`getWeeklyNutritionStats(userId, profileId)` in `lib/nutrition/db.ts` return
clean consumed-vs-target summaries.

---

## How to brief Claude going forward

1. **For a rule/number change** (macros, deficit, water target, etc.): edit the
   relevant value in this doc, then say *"apply the nutrition.md changes."*
2. **For a new feature/screen:** describe it in plain English; point at the route
   or component if you know it. Claude reads this doc for conventions.
3. **For a bug:** say what you saw and on which screen. The data helpers surface
   errors on screen now, so quoting the red error text is the fastest fix path.
4. Keep this doc current — it's what Claude reads first for nutrition work.