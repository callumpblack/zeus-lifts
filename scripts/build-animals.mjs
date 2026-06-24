// Build a curated, recognizable animal list for the "random animal on finish"
// feature, sourcing scientific names from the EOL/PanTHERIA mammal archive in
// `animal database/archive/taxon.tab`.
//
// The archive is mammals-only scientific data with no emoji or common names, so
// we keep a hand-curated map of well-known species → { common name, emoji } and
// emit only those that actually exist in the dataset.
//
// Run once:  node scripts/build-animals.mjs
// Output:    lib/animals.ts  (committed; the raw archive stays out of git)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const TAXON = join(root, "animal database", "archive", "taxon.tab");
const OUT = join(root, "lib", "animals.ts");

// Curated map: scientific binomial → { name, emoji }. We over-list; only the
// species present in the dataset survive the intersection below.
const CURATED = {
  "Panthera leo": { name: "Lion", emoji: "🦁" },
  "Panthera tigris": { name: "Tiger", emoji: "🐯" },
  "Panthera pardus": { name: "Leopard", emoji: "🐆" },
  "Panthera onca": { name: "Jaguar", emoji: "🐆" },
  "Acinonyx jubatus": { name: "Cheetah", emoji: "🐆" },
  "Canis lupus": { name: "Wolf", emoji: "🐺" },
  "Canis latrans": { name: "Coyote", emoji: "🐺" },
  "Vulpes vulpes": { name: "Red Fox", emoji: "🦊" },
  "Ursus arctos": { name: "Brown Bear", emoji: "🐻" },
  "Ursus maritimus": { name: "Polar Bear", emoji: "🐻‍❄️" },
  "Ailuropoda melanoleuca": { name: "Giant Panda", emoji: "🐼" },
  "Procyon lotor": { name: "Raccoon", emoji: "🦝" },
  "Meles meles": { name: "Badger", emoji: "🦡" },
  "Lutra lutra": { name: "Otter", emoji: "🦦" },
  "Mephitis mephitis": { name: "Skunk", emoji: "🦨" },
  "Loxodonta africana": { name: "African Elephant", emoji: "🐘" },
  "Elephas maximus": { name: "Asian Elephant", emoji: "🐘" },
  "Gorilla gorilla": { name: "Gorilla", emoji: "🦍" },
  "Pan troglodytes": { name: "Chimpanzee", emoji: "🐒" },
  "Pongo pygmaeus": { name: "Orangutan", emoji: "🦧" },
  "Giraffa camelopardalis": { name: "Giraffe", emoji: "🦒" },
  "Equus caballus": { name: "Horse", emoji: "🐴" },
  "Equus zebra": { name: "Zebra", emoji: "🦓" },
  "Equus grevyi": { name: "Grévy's Zebra", emoji: "🦓" },
  "Equus asinus": { name: "Donkey", emoji: "🫏" },
  "Hippopotamus amphibius": { name: "Hippopotamus", emoji: "🦛" },
  "Ceratotherium simum": { name: "White Rhinoceros", emoji: "🦏" },
  "Diceros bicornis": { name: "Black Rhinoceros", emoji: "🦏" },
  "Rhinoceros unicornis": { name: "Indian Rhinoceros", emoji: "🦏" },
  "Sus scrofa": { name: "Wild Boar", emoji: "🐗" },
  "Bos taurus": { name: "Cattle", emoji: "🐄" },
  "Bison bison": { name: "American Bison", emoji: "🦬" },
  "Bubalus bubalis": { name: "Water Buffalo", emoji: "🐃" },
  "Ovis canadensis": { name: "Bighorn Sheep", emoji: "🐏" },
  "Ovis aries": { name: "Sheep", emoji: "🐑" },
  "Capra hircus": { name: "Goat", emoji: "🐐" },
  "Camelus dromedarius": { name: "Dromedary Camel", emoji: "🐪" },
  "Camelus bactrianus": { name: "Bactrian Camel", emoji: "🐫" },
  "Lama glama": { name: "Llama", emoji: "🦙" },
  "Cervus elaphus": { name: "Red Deer", emoji: "🦌" },
  "Odocoileus virginianus": { name: "White-tailed Deer", emoji: "🦌" },
  "Rangifer tarandus": { name: "Reindeer", emoji: "🦌" },
  "Alces alces": { name: "Moose", emoji: "🫎" },
  "Oryctolagus cuniculus": { name: "Rabbit", emoji: "🐰" },
  "Lepus europaeus": { name: "Brown Hare", emoji: "🐇" },
  "Sciurus carolinensis": { name: "Grey Squirrel", emoji: "🐿️" },
  "Sciurus vulgaris": { name: "Red Squirrel", emoji: "🐿️" },
  "Castor canadensis": { name: "Beaver", emoji: "🦫" },
  "Castor fiber": { name: "Eurasian Beaver", emoji: "🦫" },
  "Rattus norvegicus": { name: "Brown Rat", emoji: "🐀" },
  "Mus musculus": { name: "House Mouse", emoji: "🐁" },
  "Erinaceus europaeus": { name: "Hedgehog", emoji: "🦔" },
  "Bradypus variegatus": { name: "Brown-throated Sloth", emoji: "🦥" },
  "Bradypus tridactylus": { name: "Pale-throated Sloth", emoji: "🦥" },
  "Macropus giganteus": { name: "Eastern Grey Kangaroo", emoji: "🦘" },
  "Macropus rufus": { name: "Red Kangaroo", emoji: "🦘" },
  "Phascolarctos cinereus": { name: "Koala", emoji: "🐨" },
  "Balaenoptera musculus": { name: "Blue Whale", emoji: "🐋" },
  "Megaptera novaeangliae": { name: "Humpback Whale", emoji: "🐋" },
  "Physeter macrocephalus": { name: "Sperm Whale", emoji: "🐋" },
  "Orcinus orca": { name: "Orca", emoji: "🐋" },
  "Tursiops truncatus": { name: "Bottlenose Dolphin", emoji: "🐬" },
  "Delphinus delphis": { name: "Common Dolphin", emoji: "🐬" },
  "Felis silvestris": { name: "Wildcat", emoji: "🐱" },
};

// taxon.tab columns (tab-separated, 1 header line). scientificName is index 3.
const SCI_NAME_IDX = 3;

const raw = readFileSync(TAXON, "utf8");
const lines = raw.split("\n");
const present = new Set();
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split("\t");
  const sci = (cols[SCI_NAME_IDX] || "").trim();
  if (sci) present.add(sci);
}

const animals = Object.entries(CURATED)
  .filter(([sci]) => present.has(sci))
  .map(([sci, meta]) => ({ ...meta, scientificName: sci }))
  .sort((a, b) => a.name.localeCompare(b.name));

const missing = Object.keys(CURATED).filter((sci) => !present.has(sci));

const body = `// AUTO-GENERATED by scripts/build-animals.mjs — do not edit by hand.
// Curated recognizable mammals sourced from the EOL/PanTHERIA archive
// (animal database/archive/taxon.tab). ${animals.length} species.

export interface Animal {
  name: string;
  emoji: string;
  scientificName: string;
}

export const ANIMALS: Animal[] = ${JSON.stringify(animals, null, 2)};

/** Pick a random celebratory animal for the finish screen. */
export function randomAnimal(): Animal {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}
`;

writeFileSync(OUT, body, "utf8");
console.log(`Wrote ${animals.length} animals to lib/animals.ts`);
if (missing.length) {
  console.log(`Not found in dataset (skipped): ${missing.join(", ")}`);
}
