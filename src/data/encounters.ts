// Data-driven random-encounter zones (the band-leader take on "tall grass").
// A map's encounter region object references a zone by id (its `zone` property).

export interface EncounterZone {
  /** Per-step chance (0..1) to trigger an encounter while standing in the zone. */
  rate: number;
  /** Inclusive level range for encountered musicians. */
  minLevel: number;
  maxLevel: number;
  /** Pool of species ids (from src/data/species.ts) that can appear here. */
  musicians: string[];
}

export const ENCOUNTER_ZONES: Record<string, EncounterZone> = {
  busking_street: {
    rate: 0.5,
    minLevel: 5,
    maxLevel: 8,
    musicians: ["grooveling", "crooner", "balladeer"],
  },
};

export function getEncounterZone(id: string): EncounterZone | undefined {
  return ENCOUNTER_ZONES[id];
}
