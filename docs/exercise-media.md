# Exercise detail, GIF thumbnails & muscle breakdown

Three linked features layered onto the existing exercise library.

## 1. Exercise detail modal — `/exercise/[name]`
`app/exercise/[name]/page.tsx` is a modal-style route that opens over the current
screen when an exercise **photo** is tapped (active workout, routine setup,
history, and the toughness-rating step). It shows:

- a large circular **animated GIF**,
- the exercise name in blue,
- primary + secondary muscle groups (colour-dotted with the shared palette),
- an equipment descriptor (e.g. "Barbell, free weight").

Close via the X (top-left), tapping the dimmed backdrop, `Esc`, or swiping the
card down. Tapping a photo navigates with `router.push`; closing is `router.back`.

Linking is opt-in on `ExerciseImage` via the `link` prop (it is **off** in the
exercise picker, where tapping a row adds the exercise instead).

## 2. Exercise data source — hasaneyldrm/exercises-dataset
GIFs + secondary-muscle/equipment data come from the open
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
(`data/exercises.json`, 1,324 entries, ExerciseDB taxonomy).

The app does **not** fetch this at runtime. Instead `scripts/build-exercises.mjs`
matches each of the curated `EXERCISE_LIBRARY` exercises to a dataset entry and
writes `lib/exercise-media.generated.json` (name → `{ gifUrl, bodyPart, target,
secondaryMuscles, datasetId }`). This keeps thumbnails instant, offline-safe, and
independent of a flaky mid-workout network call. GIFs are served straight from
`raw.githubusercontent.com`.

Regenerate after editing the library (matching is curated via an `OVERRIDES` map;
the script validates every GIF URL and drops dead ones):

```
npm run build:exercises          # fetches the dataset and rewrites the JSON
node scripts/build-exercises.mjs <path/to/exercises.json>   # use a local copy
node scripts/build-exercises.mjs --no-validate              # skip the HEAD checks
```

`ExerciseImage` now prefers the GIF, falls back to the static wrkout photo, then
to the grey dumbbell glyph (lazy-loaded, browser-cached).

## 3. Body-part breakdown on workout finish
The finish screen (`components/WorkoutSummary.tsx`) shows a **Recharts** doughnut
of training volume by primary muscle, with a legend listing each muscle's share
(%) and exact kg. `lib/muscle-groups.ts` provides `volumeByMuscle(workout)` and
the granular `MUSCLE_COLOR` palette (one stable colour per muscle, reused in the
detail modal). Recharts is lazy-loaded (`next/dynamic`, `ssr:false`) so it only
weighs on the finish screen, not the active-logging bundle.

## Schema — run migration `0012_exercise_media.sql`
Like the nutrition tables, the Supabase backend needs the migration applied in
the SQL editor (without it the app silently uses the localStorage fallback):

- `workout_exercises.body_part` — denormalized primary muscle group, written at
  save time for fast volume charts.
- `exercises_cache (id, name, equipment, body_part, target, gif_url)` — optional
  mirror of the library + GIF data for future server-side lookups. Populated
  best-effort on app load via `ensureExerciseCache()`; the UI reads the embedded
  JSON, so the table is purely a convenience.
