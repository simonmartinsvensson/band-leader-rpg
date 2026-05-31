import type { EncounterZone } from "../data/encounters";

/**
 * Roll for a random encounter in a zone. Pure and engine-agnostic: pass a random
 * source (defaults to Math.random) so it's deterministic in tests.
 *
 * @returns the encountered musician id, or null if no encounter this step.
 */
export function rollEncounter(zone: EncounterZone, random: () => number = Math.random): string | null {
  if (random() >= zone.rate) return null;
  if (zone.musicians.length === 0) return null;
  const index = Math.floor(random() * zone.musicians.length);
  return zone.musicians[index] ?? null;
}
