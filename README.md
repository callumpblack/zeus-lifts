# Zeus Lifts

A personal, mobile-first weight-training tracker styled after Hevy. Dark theme,
single blue accent, no login. Built with **Next.js 14 (App Router) + TypeScript
+ Tailwind CSS**, with **Supabase (Postgres)** for persistence.

> Runs out of the box on `localStorage` — add Supabase keys later to sync across
> devices. No auth, single user.

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

That's it. Without any configuration the app stores everything in your browser's
`localStorage` and pre-loads the 4 Zeus routines.

## Enabling Supabase (optional, for cross-device sync)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the 5 tables and seeds the 4 routines.
3. Copy `.env.local.example` → `.env.local` and paste your **Project URL** and
   **anon public key** (Project Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Restart `npm run dev`. The data layer detects the env vars and switches from
   `localStorage` to Supabase automatically.

Because this is a personal single-user app, the migration enables Row Level
Security with an **open "public access" policy** (the anon key can read/write).
If you ever add auth, replace those policies with user-scoped ones.

---

## Features

- **Home** — start an empty workout, browse the 4 pre-loaded routines, create
  your own. Each routine card previews its first 3 exercises and starts on tap.
- **With Friend / Solo** — starting a routine asks which session you want.
  "With Friend" loads the core lifts; "Solo" adds the extra volume.
- **Live workout logger** — duration counts up live, volume (kg) and set count
  update as you tick sets. Ticked rows turn green. Per-exercise rest timer,
  notes (pre-filled with the routine target, e.g. *"4 sets of 6–8 reps"*),
  add/remove sets and exercises.
- **Exercise picker** — search, equipment/muscle filters, recent exercises, and
  an alphabetical list with real exercise photos.
- **Previous column** — pulls your last logged performance for each set.
- **Finish summary** — duration, volume, sets, and any personal records broken.
- **History** — every completed workout, newest first, expandable to the full
  set-by-set breakdown.
- **Exercise images** — pulled from the open-source
  [wrkout/exercises.json](https://github.com/wrkout/exercises.json) repo and
  shown as circles, with a grey dumbbell fallback on any 404.

## Project structure

```
app/
  page.tsx                     Home (routines + start workout)
  workout/new/                 Empty workout logger
  workout/routine/[id]/        Routine-based workout (?mode=with_friend|solo)
  routines/new/                Create / edit a routine (?edit=<id>)
  history/                     Completed workout history
components/                    UI: logger, exercise blocks, picker, nav, …
lib/
  db.ts                        Persistence (Supabase + localStorage fallback)
  exercises.ts                 Exercise library + verified image slugs
  seed-routines.ts             The 4-day Zeus programme (source of truth)
  supabase.ts  types.ts  format.ts
supabase/migrations/
  0001_init.sql                Schema + seed
```

## Scripts

| Command          | What it does                          |
| ---------------- | ------------------------------------- |
| `npm run dev`    | Dev server at http://localhost:3000   |
| `npm run build`  | Production build                      |
| `npm run start`  | Serve the production build            |
| `npm run typecheck` | Type-check without emitting        |

## Notes

- All weights are in **kg**.
- Designed for a 375px-wide mobile browser; the layout is capped to a phone
  column and centred on desktop.
- A workout in progress is auto-saved as a draft, so a refresh won't lose it.
