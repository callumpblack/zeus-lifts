# Nutrition module — context & spec

The single source of truth for the nutrition tracker. Read this to understand
how it works; **edit it to tell Claude how you want it to work.** If you change a
rule here (e.g. a macro constant), say "apply the nutrition.md changes" and it'll
be implemented to match.

Last updated: 2026-06-25 (enriched with coaching session data)

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

## Confirmed profiles (source of truth for seeding / onboarding defaults)

These are the real, calculated targets used in coaching sessions. Use these to
pre-populate onboarding or validate that `macros.ts` produces matching output.

### Zeus

| Field | Value |
|---|---|
| DOB | 08/10/1997 (age 28) |
| Sex | Male |
| Height | 193 cm |
| Current weight | 99.5 kg |
| Goal weight | 85–90 kg |
| Activity multiplier | 1.55 (moderately active) |
| BMR | ~2,066 kcal |
| TDEE | ~3,202 kcal |
| Goal | Lose fat |
| Daily deficit | 500 kcal |
| **Calorie target** | **2,700 kcal** |
| **Protein** | **219–220 g** (1 g/lb at 219 lbs) |
| **Fat** | **85 g** (min 0.35 g/lb) |
| **Carbs** | **~265 g** (remainder) |
| High-activity day target | 3,200–3,400 kcal (gym + additional sport) |
| Expected loss rate | ~0.5–0.7 kg/week |

**Zeus — hard constraints that must be respected in meal suggestions:**
- Hiatus hernia + IBS-type digestive sensitivity — no heat-based spices (Kashmiri
  chilli, cumin, za'atar and similar removed; reintroduce only after 3–5 day reset)
- No whole fruit (texture aversion); blended/smoothie fruit is fine; banana excluded always
- Coffee on empty stomach flagged as problematic — do not suggest pre-breakfast caffeine
- Skin-on poultry adds unnecessary fat — default to skinless
- After-dinner refined carb habit (chocolate, cornflakes) is the main sabotage point

**Zeus — training day calorie cycling:**
Standard days: 2,700 kcal. Days with gym session plus additional sport (e.g. padel,
swimming, running): increase to 3,200–3,400 kcal. Holding the same deficit on
high-activity days risks muscle loss and metabolic adaptation.

---

### Hera

| Field | Value |
|---|---|
| DOB | 12/08/1997 (age 28) |
| Sex | Female |
| Height | 162.5 cm (5 ft 4) |
| Current weight | 57.6 kg (9 st 1 lb) |
| Goal weight | 53.1 kg (8 st 5 lb) |
| Activity multiplier | 1.55 (moderately active) |
| BMR | ~1,291 kcal |
| TDEE | ~2,001 kcal |
| Goal | Lose fat |
| Daily deficit | 500 kcal |
| **Calorie target** | **1,500 kcal** (floor: 1,400 kcal) |
| **Protein** | **127 g** (1 g/lb at 127 lbs) |
| **Fat** | **50 g** (min 0.35 g/lb) |
| **Carbs** | **~135 g** (remainder) |
| Expected loss rate | ~0.4–0.5 kg/week |

**Hera — hard constraints:**
- Digestive condition: lighter evening meals; minimum 2-hour gap before lying down
- Prefers to reduce pork
- Cycle-based nutrition advice to be considered (requested)
- Hydration currently below target (1–1.5 L/day); goal is 2–2.5 L/day

---

## Shared meal context

Zeus and Hera share lunch and dinner most days. When displaying shared meals,
protein portions are calculated on a **60/40 split by weight (Zeus/Hera)**,
approximately 300 g / 200 g of protein source respectively.

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

Deficit (lose) = **500 kcal/day default** (`DEFAULT_DAILY_DEFICIT`). If BOTH a
target weight and a deadline are set, it's derived from that pace instead
(weekly-kg × 7700 / 7), **capped at 750 kcal/day** (`MAX_DAILY_DEFICIT`).

**4. Macro split** (the tunable constants):
| Constant | Current value | Notes |
|---|---|---|
| `PROTEIN_PER_LB` (all goals) | **1.0 g/lb** (≈ 2.2 g/kg) | confirmed standard |
| `FAT_CALORIE_SHARE` | **0.28** (28% of calories) | matches confirmed fat targets |
| Carbs | remainder | calories − protein·4 − fat·9, ÷4 |

Protein is per-lb of bodyweight; fat is a share of calories; carbs fill the
rest. Fat tracks calories, so fat and carbs still shift with the goal.

### Protein level — RESOLVED & APPLIED
**1.0 g/lb** across all goals (Zeus ~219 g, Hera ~127 g) is applied in
`macros.ts`. Combined with fat at **28% of calories** and a **500 kcal/day**
default deficit, the calculator reproduces the confirmed Zeus
(2,700 / 219 / 85 / 265) and Hera (1,500 / 127 / 50 / 135) targets.

---

## Supplements — Zeus (audited and confirmed)

These are active and should appear in any supplement checklist UI:

| Supplement | Dose | Timing |
|---|---|---|
| Creatine monohydrate | Standard (3–5 g) | Any time |
| Lion's mane | Per product | Morning |
| Omega-3 (Together Natural Algae DHA) | 2 capsules (660 mg EPA+DHA) | With food |
| Magnesium glycinate | Per product | 60–90 min before bed |
| Vitamin D3 | 2,000 IU | With breakfast |
| L-Glutamine powder (MyProtein) | 5 g | Post-workout |
| High5 ZERO electrolyte tablet | 1 tab | During training |
| Whey protein isolate (MyProtein Grass-Fed, vanilla) | 1 scoop (~25 g protein) | Post-gym with 250 ml semi-skimmed milk |

Do not suggest probiotic pills — kefir in the daily smoothie provides sufficient
coverage and is already logged.

---

## Gut health protocols — Zeus (inform meal suggestions)

- Daily kefir + Greek yoghurt smoothie (50/50 blend, ground flaxseed, optional
  whey scoop) — ~41 g protein with whey. This is a confirmed snack/breakfast item.
- Sauerkraut or kimchi for microbiome diversity — include where practical
- Psyllium husk 5 g/day for soluble fibre
- Fresh ginger tea — especially post-meal if digestive discomfort
- Avoid suggesting coffee before breakfast or on an empty stomach

---

## Spice reintroduction plan — Zeus

Following a significant bloating episode (June 2026), all heat-based spices were
removed. Reintroduction timeline:

- **Days 1–5:** No spices at all. Herbs only (basil, parsley, dill, oregano).
- **Week 2 onwards:** Mild cooked herbs and anti-inflammatory seasonings only
  (turmeric, cinnamon, ginger — cooked in, not raw/heavy).
- **4–6 weeks:** Mild coconut-based or creamy curry variants may be trialled.
- **Persistent avoid:** Heavy traditional curries (Kashmiri chilli, cumin-heavy
  dishes, za'atar) are likely permanent triggers at high quantities.

Do not suggest spiced meals for Zeus until the reintroduction phase is confirmed complete.

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