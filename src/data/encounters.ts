// Data-driven random-encounter zones (the band-leader take on "tall grass").
// A map's encounter region object references a zone by id (its `zone` property).

export interface EncounterZone {
  /** Per-step chance (0..1) to trigger an encounter while standing in the zone. */
  rate: number;
  /**
   * Pool of musician ids that can be encountered here. Placeholder ids for now —
   * real musician data + battles come later.
   */
  musicians: string[];
}

export const ENCOUNTER_ZONES: Record<string, EncounterZone> = {
  busking_street: {
    rate: 0.5,
    musicians: ["busker_drummer", "subway_singer", "open_mic_guitarist"],
  },
};

export function getEncounterZone(id: string): EncounterZone | undefined {
  return ENCOUNTER_ZONES[id];
}
