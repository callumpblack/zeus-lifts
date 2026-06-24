// Open Food Facts client. Free, key-less food database. We hit the legacy
// search endpoint and normalise each hit to per-100g macros, defensively —
// OFF entries are crowdsourced and frequently missing fields.

import type { FoodSearchResult } from "./types";

const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

interface OFFNutriments {
  ["energy-kcal_100g"]?: number;
  ["energy_100g"]?: number; // kJ fallback
  ["proteins_100g"]?: number;
  ["fat_100g"]?: number;
  ["carbohydrates_100g"]?: number;
  ["fiber_100g"]?: number;
  ["sugars_100g"]?: number;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: OFFNutriments;
}

/** A finite number or null — guards against NaN / undefined / strings. */
function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function kcal(nutr: OFFNutriments): number | null {
  const direct = num(nutr["energy-kcal_100g"]);
  if (direct != null) return direct;
  const kj = num(nutr["energy_100g"]); // kJ → kcal fallback
  return kj != null ? Math.round(kj / 4.184) : null;
}

function normalise(p: OFFProduct): FoodSearchResult | null {
  const name = p.product_name?.trim();
  if (!name) return null; // skip nameless products (brief requirement)
  const nutr = p.nutriments ?? {};
  return {
    id: p.code?.trim() || name,
    name,
    brand: p.brands?.split(",")[0]?.trim() || null,
    caloriesPer100g: kcal(nutr),
    proteinPer100g: num(nutr["proteins_100g"]),
    fatPer100g: num(nutr["fat_100g"]),
    carbsPer100g: num(nutr["carbohydrates_100g"]),
    fibrePer100g: num(nutr["fiber_100g"]),
    sugarPer100g: num(nutr["sugars_100g"]),
  };
}

/**
 * Search foods by free text. Throws on network/parse failure so the caller can
 * show the "search unavailable — log manually" state.
 */
export async function searchFoods(
  query: string,
  signal?: AbortSignal
): Promise<FoodSearchResult[]> {
  const term = query.trim();
  if (!term) return [];

  const url = new URL(SEARCH_URL);
  url.searchParams.set("search_terms", term);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "true");
  url.searchParams.set("page_size", "20");
  url.searchParams.set("fields", "code,product_name,brands,nutriments");

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Open Food Facts responded ${res.status}`);

  const data = (await res.json()) as { products?: OFFProduct[] };
  const products = Array.isArray(data.products) ? data.products : [];
  return products
    .map(normalise)
    .filter((r): r is FoodSearchResult => r !== null);
}

/** Scale a per-100g value to a serving size, or null when the base is unknown. */
export function scalePer100g(
  per100g: number | null,
  servingG: number
): number | null {
  if (per100g == null) return null;
  return (per100g / 100) * servingG;
}
