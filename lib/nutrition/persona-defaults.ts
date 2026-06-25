import type { Persona } from "@/lib/types";
import type { MacroInputs } from "./types";

/**
 * Confirmed onboarding defaults for the two household personas, taken from the
 * coaching-session profiles in docs/nutrition.md. Picking Zeus/Hera on first
 * login pre-fills the profile form with these — the user can still edit any
 * field before saving.
 *
 * Run through the calculator (PROTEIN_PER_LB 1.0, FAT 28%, 500 kcal deficit)
 * these reproduce: Zeus ~2,700 kcal / 219P / 85F / 265C, Hera ~1,500 / 127 / 50 / 135.
 */
export interface PersonaDefaults extends Partial<MacroInputs> {
  label: string;
}

export const PERSONA_DEFAULTS: Record<Persona, PersonaDefaults> = {
  zeus: {
    label: "Zeus",
    sex: "male",
    dateOfBirth: "1997-10-08",
    heightCm: 193,
    weightKg: 99.5,
    activityLevel: 1.55,
    goal: "lose",
    targetWeightKg: 87.5, // midpoint of the 85–90 kg goal range
  },
  hera: {
    label: "Hera",
    sex: "female",
    dateOfBirth: "1997-08-12",
    heightCm: 162.5,
    weightKg: 57.6,
    activityLevel: 1.55,
    goal: "lose",
    targetWeightKg: 53.1,
  },
};
