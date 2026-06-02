import { RARE_CHANCE, type EncounterZone } from "../data/encounters";

/** Pick a uniformly-random entry from a pool, or null if empty. */
function pick(pool: string[], random: () => number): string | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(random() * pool.length)] ?? null;
}

/**
 * Roll for a random encounter in a zone. Pure and engine-agnostic: pass a random
 * source (defaults to Math.random) so it's deterministic in tests.
 *
 * Order of random draws: (1) the rate roll; then, only if the zone has a `rare`
 * pool, (2) a common-vs-rare roll; then (3) the pick from the chosen pool. Zones
 * without a `rare` pool skip draw (2), so the common path is unchanged.
 *
 * @returns the encountered musician id, or null if no encounter this step.
 */
export function rollEncounter(zone: EncounterZone, random: () => number = Math.random): string | null {
  if (random() >= zone.rate) return null;
  const rare = zone.rare ?? [];
  if (rare.length > 0 && random() < (zone.rareChance ?? RARE_CHANCE)) {
    return pick(rare, random);
  }
  return pick(zone.musicians, random);
}
