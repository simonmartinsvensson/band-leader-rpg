import type { Technique } from "../types/technique";

/**
 * The technique pool (move equivalents). Two per genre; a couple are status
 * techniques (power 0) with buff/debuff effects, one has raised priority.
 * Referenced by id from species learnsets (src/data/species.ts).
 */
export const TECHNIQUES: Record<string, Technique> = {
  // Jazz
  blue_note: { id: "blue_note", name: "Blue Note", genre: "jazz", power: 50, accuracy: 1.0, staminaCost: 8, priority: 0 },
  improv_solo: { id: "improv_solo", name: "Improv Solo", genre: "jazz", power: 75, accuracy: 0.9, staminaCost: 15, priority: 0 },

  // Rock
  power_chord: { id: "power_chord", name: "Power Chord", genre: "rock", power: 60, accuracy: 0.95, staminaCost: 10, priority: 0 },
  stage_dive: { id: "stage_dive", name: "Stage Dive", genre: "rock", power: 90, accuracy: 0.8, staminaCost: 20, priority: 0 },

  // Classical
  sonata: { id: "sonata", name: "Sonata", genre: "classical", power: 65, accuracy: 0.95, staminaCost: 12, priority: 0 },
  crescendo: {
    id: "crescendo",
    name: "Crescendo",
    genre: "classical",
    power: 0,
    accuracy: 1.0,
    staminaCost: 6,
    priority: 0,
    effect: { kind: "buff", stat: "skill", stages: 1, target: "self", chance: 1 },
  },

  // Funk
  groove_lock: {
    id: "groove_lock",
    name: "Groove Lock",
    genre: "funk",
    power: 55,
    accuracy: 1.0,
    staminaCost: 9,
    priority: 0,
    effect: { kind: "debuff", stat: "tempo", stages: 1, target: "opponent", chance: 0.3 },
  },
  slap_bass: { id: "slap_bass", name: "Slap Bass", genre: "funk", power: 75, accuracy: 0.9, staminaCost: 15, priority: 0 },

  // Electronic
  drop: { id: "drop", name: "The Drop", genre: "electronic", power: 95, accuracy: 0.75, staminaCost: 22, priority: 0 },
  sync_pulse: { id: "sync_pulse", name: "Sync Pulse", genre: "electronic", power: 45, accuracy: 1.0, staminaCost: 7, priority: 1 },

  // Folk
  fingerpick: { id: "fingerpick", name: "Fingerpick", genre: "folk", power: 50, accuracy: 1.0, staminaCost: 8, priority: 0 },
  campfire_song: {
    id: "campfire_song",
    name: "Campfire Song",
    genre: "folk",
    power: 0,
    accuracy: 1.0,
    staminaCost: 5,
    priority: 0,
    effect: { kind: "buff", stat: "composure", stages: 1, target: "self", chance: 1 },
  },
};

export const TECHNIQUE_LIST = Object.values(TECHNIQUES);

export function getTechnique(id: string): Technique | undefined {
  return TECHNIQUES[id];
}
