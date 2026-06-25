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

## How the two sections fit together

- **Shared login** — username + 6-digit PIN (Supabase auth). One account.
- **Unified onboarding** — first login is `sign in → pick Zeus/Hera → fill ONE
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

**2. TDEE** = BMR × activity multiplier (1.2 sedentary → 1.9 athlete).

**3. Calorie target** (by goal):
| Goal | Calories |
|---|---|
| Lose fat | TDEE − deficit |
| Maintain | TDEE |
| Gain muscle | TDEE + **300** (`GAIN_SURPLUS`) |
| Lose fat & gain muscle (recomp) | TDEE (maintenance) |

Deficit (lose) = weekly-kg-pace × 7700 / 7, **capped at 750 kcal/day**
(`MAX_DAILY_DEFICIT`). With no target weight/deadline it assumes **0.5 kg/week**.

**4. Macro split** (the tunable constants):
| Constant | Current value | Notes |
|---|---|---|
| `PROTEIN_PER_LB.lose` / `.recomp` | **1.1 g/lb** (≈ 2.4 g/kg) | ⚠️ high — see below |
| `PROTEIN_PER_LB.maintain` / `.gain` | **1.0 g/lb** (≈ 2.2 g/kg) | |
| `FAT_CALORIE_SHARE` | **0.25** (25% of calories) | |
| Carbs | remainder | calories − protein·4 − fat·9, ÷4 |

Protein is per-lb (varies by goal), fat is a share of calories, carbs fill the
rest — so changing the goal shifts **all three** macros.

### ⚠️ Open question: protein is high
At 1.1 g/lb, a ~97 kg cutter gets **~236 g protein** (≈ 2.4 g/kg), which is at
the top of the evidence-based range. Common, more moderate defaults:
- **1.0 g/lb flat** (≈ 2.2 g/kg) → ~215 g for that person, still high-ish.
- **g/kg basis**, e.g. lose 2.0 / maintain 1.8 / gain 1.6 g/kg → ~194 g / 175 g /
  155 g. More reasonable while still high-protein, and still varies by goal.

→ Tell Claude which you prefer (or write the numbers you want into the table
above) and it'll update `macros.ts`.

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
