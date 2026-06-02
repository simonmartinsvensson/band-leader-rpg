import type { Technique } from "../types/technique";

/**
 * The technique pool (the band-leader take on Pokémon "moves"). Five per genre
 * (a core trio + an expanded pair below), each genre with its own feel:
 *
 *   • Jazz   — finesse: a dependable foundation + a risky virtuoso flourish.
 *   • Rock   — spectacle: a staple hit + a reckless, high-power gamble.
 *   • Classical — dynamics: build yourself up, then strike at full force.
 *   • Funk   — the groove: lock the opponent's tempo + a signature smack.
 *   • Electronic — the machine: a fast first-strike + the massive payoff.
 *   • Folk   — warmth: a steady reliable pick + rally the band's nerve.
 *
 * `name` is display flavour; the id (referenced by species learnsets in
 * src/data/species.ts) and the mechanical fields are the contract.
 */
export const TECHNIQUES: Record<string, Technique> = {
  // Jazz — finesse
  blue_note: { id: "blue_note", name: "Walking Bassline", genre: "jazz", power: 50, accuracy: 1.0, staminaCost: 8, priority: 0 },
  improv_solo: { id: "improv_solo", name: "Improv Solo", genre: "jazz", power: 75, accuracy: 0.9, staminaCost: 15, priority: 0 },
  syncopation: {
    id: "syncopation",
    name: "Syncopation",
    genre: "jazz",
    power: 60,
    accuracy: 0.95,
    staminaCost: 11,
    priority: 0,
    effect: { kind: "debuff", stat: "tempo", stages: 1, target: "opponent", chance: 0.3 },
  },

  // Rock — spectacle
  power_chord: { id: "power_chord", name: "Power Chord", genre: "rock", power: 60, accuracy: 0.95, staminaCost: 10, priority: 0 },
  stage_dive: { id: "stage_dive", name: "Stage Dive", genre: "rock", power: 90, accuracy: 0.8, staminaCost: 20, priority: 0 },
  feedback_wail: {
    id: "feedback_wail",
    name: "Feedback Wail",
    genre: "rock",
    power: 70,
    accuracy: 0.9,
    staminaCost: 14,
    priority: 0,
    effect: { kind: "debuff", stat: "composure", stages: 1, target: "opponent", chance: 0.2 },
  },

  // Classical — dynamics
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
  sonata: { id: "sonata", name: "Fortissimo", genre: "classical", power: 65, accuracy: 0.95, staminaCost: 12, priority: 0 },
  fugue: { id: "fugue", name: "Fugue", genre: "classical", power: 70, accuracy: 0.95, staminaCost: 13, priority: 0 },

  // Funk — the groove
  groove_lock: {
    id: "groove_lock",
    name: "In the Pocket",
    genre: "funk",
    power: 55,
    accuracy: 1.0,
    staminaCost: 9,
    priority: 0,
    effect: { kind: "debuff", stat: "tempo", stages: 1, target: "opponent", chance: 0.3 },
  },
  slap_bass: { id: "slap_bass", name: "Slap Bass", genre: "funk", power: 75, accuracy: 0.9, staminaCost: 15, priority: 0 },
  drop_the_one: { id: "drop_the_one", name: "Drop the One", genre: "funk", power: 80, accuracy: 0.9, staminaCost: 16, priority: 0 },

  // Electronic — the machine
  sync_pulse: { id: "sync_pulse", name: "Glitch", genre: "electronic", power: 45, accuracy: 1.0, staminaCost: 7, priority: 1 },
  drop: { id: "drop", name: "The Drop", genre: "electronic", power: 95, accuracy: 0.75, staminaCost: 22, priority: 0 },
  sidechain: {
    id: "sidechain",
    name: "Sidechain",
    genre: "electronic",
    power: 0,
    accuracy: 1.0,
    staminaCost: 6,
    priority: 0,
    effect: { kind: "buff", stat: "tempo", stages: 1, target: "self", chance: 1 },
  },

  // Folk — warmth
  fingerpick: { id: "fingerpick", name: "Fingerpicking", genre: "folk", power: 50, accuracy: 1.0, staminaCost: 8, priority: 0 },
  hoedown: { id: "hoedown", name: "Hoedown", genre: "folk", power: 65, accuracy: 0.95, staminaCost: 12, priority: 0 },
  campfire_song: {
    id: "campfire_song",
    name: "Campfire Singalong",
    genre: "folk",
    power: 0,
    accuracy: 1.0,
    staminaCost: 5,
    priority: 0,
    effect: { kind: "buff", stat: "composure", stages: 1, target: "self", chance: 1 },
  },

  // --- Expanded pool: each genre gets a dependable early hit + a big risky one
  // (keeps the per-genre feel; gives the wider roster room for varied learnsets).
  // Jazz
  comping: { id: "comping", name: "Comping", genre: "jazz", power: 40, accuracy: 1.0, staminaCost: 7, priority: 0 },
  trading_fours: { id: "trading_fours", name: "Trading Fours", genre: "jazz", power: 72, accuracy: 0.9, staminaCost: 15, priority: 0 },
  // Rock
  garage_riff: { id: "garage_riff", name: "Garage Riff", genre: "rock", power: 45, accuracy: 1.0, staminaCost: 8, priority: 0 },
  wall_of_sound: { id: "wall_of_sound", name: "Wall of Sound", genre: "rock", power: 85, accuracy: 0.85, staminaCost: 19, priority: 0 },
  // Classical
  arpeggio: { id: "arpeggio", name: "Arpeggio", genre: "classical", power: 45, accuracy: 1.0, staminaCost: 8, priority: 0 },
  grand_finale: { id: "grand_finale", name: "Grand Finale", genre: "classical", power: 90, accuracy: 0.85, staminaCost: 20, priority: 0 },
  // Funk
  clavinet: { id: "clavinet", name: "Clavinet", genre: "funk", power: 45, accuracy: 1.0, staminaCost: 8, priority: 0 },
  p_funk: { id: "p_funk", name: "P-Funk", genre: "funk", power: 85, accuracy: 0.85, staminaCost: 19, priority: 0 },
  // Electronic
  bitcrush: { id: "bitcrush", name: "Bitcrush", genre: "electronic", power: 45, accuracy: 1.0, staminaCost: 8, priority: 0 },
  wobble_bass: { id: "wobble_bass", name: "Wobble Bass", genre: "electronic", power: 85, accuracy: 0.8, staminaCost: 20, priority: 0 },
  // Folk
  strum: { id: "strum", name: "Strum", genre: "folk", power: 45, accuracy: 1.0, staminaCost: 8, priority: 0 },
  barn_burner: { id: "barn_burner", name: "Barn Burner", genre: "folk", power: 82, accuracy: 0.9, staminaCost: 17, priority: 0 },
};

export const TECHNIQUE_LIST = Object.values(TECHNIQUES);

export function getTechnique(id: string): Technique | undefined {
  return TECHNIQUES[id];
}
