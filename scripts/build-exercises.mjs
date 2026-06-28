// Build the exercise-media mapping that powers the GIF thumbnails and the
// /exercise/[name] detail modal.
//
// It enriches the app's curated EXERCISE_LIBRARY (lib/exercises.ts) with the
// animated GIFs + muscle/equipment data from the open hasaneyldrm/exercises
// dataset, writing a static JSON the app imports at build time. Keeping the
// data static (rather than fetched at runtime) means thumbnails resolve
// instantly, work offline / in the localStorage fallback, and never depend on
// a flaky network call mid-workout. Re-run to refresh:
//
//   node scripts/build-exercises.mjs
//
// Output: lib/exercise-media.generated.json
//
// Matching: each library exercise maps to a dataset entry via an explicit
// override (by 4-digit dataset id, robust against the dataset's occasional
// name mojibake) where the fuzzy guess was wrong, otherwise via token overlap.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DATASET_BRANCH = "main";
const DATASET_JSON = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${DATASET_BRANCH}/data/exercises.json`;
const RAW_BASE = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${DATASET_BRANCH}/`;

// Curated overrides where token matching picks the wrong entry. Values are the
// dataset `id` (preferred — stable & encoding-proof) or an exact dataset name.
const OVERRIDES = {
  "Incline Dumbbell Press": "dumbbell incline bench press",
  "Cable Crossover": "0155", // cable cross-over variation (chest)
  "Rear Delt Fly (Cable)": "0154", // cable cross-over revers fly
  "Face Pull": "0203", // cable rear delt row (with rope)
  "Lat Pulldown (Close Grip)": "0818", // twin handle parallel grip lat pulldown
  "Bicep Curl (Dumbbell)": "0294", // dumbbell biceps curl
  "Bench Dips": "0129", // bench dip (knees bent)
  "Squat (Barbell)": "0043", // barbell full squat
  "Leg Press (Machine)": "1463", // sled 45° leg press (0739's gif is missing upstream)
  "Leg Curl (Machine)": "0586", // lever lying leg curl
  "Hip Thrust": "1409", // barbell glute bridge (no barbell hip thrust in set)
  "Calf Raise (Machine)": "0605", // lever standing calf raise
  "Plank": "0464", // front plank with twist (closest plain plank)
};

const STOP = new Set(["the", "a", "with", "and", "of", "to", "grip", "medium", "version", "v"]);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s) => norm(s).split(" ").filter((t) => t && !STOP.has(t));

/** Parse the curated library entries straight out of lib/exercises.ts. */
async function readLibrary() {
  const src = await readFile(join(ROOT, "lib", "exercises.ts"), "utf8");
  const re = /\{\s*name:\s*"([^"]+)",\s*slug:\s*("[^"]*"|null),\s*primaryMuscle:\s*"([^"]+)",\s*equipment:\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    out.push({ name: m[1], primaryMuscle: m[3], equipment: m[4] });
  }
  return out;
}

function scoreMatch(libName, libEquip, entry) {
  const a = new Set(toks(libName));
  const b = new Set(toks(entry.name));
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const jac = inter / (a.size + b.size - inter || 1);
  const equipBonus = norm(entry.equipment).includes(norm(libEquip)) ? 0.15 : 0;
  return jac + equipBonus;
}

async function main() {
  const localArg = process.argv[2]; // optional path to a cached exercises.json
  let dataset;
  if (localArg) {
    dataset = JSON.parse(await readFile(localArg, "utf8"));
    console.log(`Loaded ${dataset.length} dataset entries from ${localArg}`);
  } else {
    console.log(`Fetching ${DATASET_JSON} ...`);
    const res = await fetch(DATASET_JSON);
    if (!res.ok) throw new Error(`Dataset fetch failed: ${res.status}`);
    dataset = await res.json();
    console.log(`Fetched ${dataset.length} dataset entries`);
  }

  const byId = new Map(dataset.map((e) => [e.id, e]));
  const byName = new Map(dataset.map((e) => [norm(e.name), e]));

  const library = await readLibrary();
  console.log(`Parsed ${library.length} library exercises`);

  const exercises = {};
  const report = [];
  for (const lib of library) {
    let entry = null;
    let how = "fuzzy";
    const ov = OVERRIDES[lib.name];
    if (ov) {
      entry = /^\d{4}$/.test(ov) ? byId.get(ov) : byName.get(norm(ov));
      how = "override";
      if (!entry) console.warn(`  ! override for "${lib.name}" (${ov}) not found`);
    }
    if (!entry) {
      let best = null;
      let bestScore = 0;
      for (const e of dataset) {
        const s = scoreMatch(lib.name, lib.equipment, e);
        if (s > bestScore) {
          bestScore = s;
          best = e;
        }
      }
      entry = bestScore >= 0.45 ? best : null; // below threshold ⇒ no gif (fallback)
      how = entry ? `fuzzy(${bestScore.toFixed(2)})` : "none";
    }

    if (entry) {
      exercises[lib.name] = {
        datasetId: entry.id,
        datasetName: entry.name,
        gifUrl: RAW_BASE + entry.gif_url,
        bodyPart: entry.body_part,
        target: entry.target,
        secondaryMuscles: Array.isArray(entry.secondary_muscles)
          ? entry.secondary_muscles
          : [],
      };
    }
    report.push(
      `${lib.name.padEnd(40)} ${how.padEnd(13)} -> ${entry ? entry.name : "(fallback)"}`
    );
  }

  // Validate that each chosen GIF actually exists upstream (not every dataset
  // entry has its video committed). Drop the gif on a dead URL so the app falls
  // back to the static photo / dumbbell glyph rather than a broken image.
  // Skip with --no-validate for a fast offline regen.
  if (!process.argv.includes("--no-validate")) {
    console.log("\nValidating GIF URLs ...");
    const names = Object.keys(exercises);
    await Promise.all(
      names.map(async (name) => {
        try {
          const r = await fetch(exercises[name].gifUrl, { method: "HEAD" });
          if (r.status !== 200) {
            console.warn(`  ! ${name}: gif ${r.status} — dropping (${exercises[name].gifUrl})`);
            exercises[name].gifUrl = null;
          }
        } catch (e) {
          console.warn(`  ! ${name}: gif fetch error — dropping`);
          exercises[name].gifUrl = null;
        }
      })
    );
  }

  const payload = {
    _comment:
      "GENERATED by scripts/build-exercises.mjs from hasaneyldrm/exercises-dataset. Do not edit by hand.",
    _generatedAt: new Date().toISOString(),
    _source: `hasaneyldrm/exercises-dataset@${DATASET_BRANCH}`,
    exercises,
  };
  const outPath = join(ROOT, "lib", "exercise-media.generated.json");
  await writeFile(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log("\n" + report.join("\n"));
  console.log(
    `\nWrote ${Object.keys(exercises).length}/${library.length} mapped exercises to ${outPath}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
