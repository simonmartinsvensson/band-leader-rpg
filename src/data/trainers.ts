// Trainers: rival band leaders and venue headliners. A trainer has a fixed
// team, triggers a battle on sight or interaction, pays out on defeat, and is
// recorded once beaten (registry "trainersDefeated"). Venue bosses also grant a
// residency. Referenced from map objects by id (object type "trainer").

export interface TrainerMember {
  species: string;
  level: number;
}

export interface Trainer {
  id: string;
  name: string;
  team: TrainerMember[];
  /** Currency awarded on defeat. */
  reward: number;
  /** Lines shown before the battle. */
  intro: string[];
  /** Lines shown after the player wins. */
  defeatLine: string[];
  /** Line shown when re-talked to after being beaten. */
  postLine: string[];
  /** Line-of-sight range in tiles (0 = interaction only). */
  sightRange: number;
  /** If set, defeating this trainer grants the residency (venue boss). */
  residency?: string;
}

export const TRAINERS: Record<string, Trainer> = {
  rival_max: {
    id: "rival_max",
    name: "Rival Max",
    team: [
      { species: "grooveling", level: 5 },
      { species: "synthling", level: 6 },
    ],
    reward: 300,
    intro: ["Think you can lead a band?", "My crew will blow you off the stage!"],
    defeatLine: ["Tch... your sound's tighter than I thought."],
    postLine: ["Go on, the venues are waiting for you."],
    sightRange: 3,
  },
  jazz_headliner: {
    id: "jazz_headliner",
    name: "Headliner Vera",
    team: [
      { species: "crooner", level: 8 },
      { species: "fusionaut", level: 9 },
    ],
    reward: 800,
    intro: ["Welcome to The Blue Note.", "Show me your band can swing."],
    defeatLine: ["Beautiful. That's a headliner's sound."],
    postLine: ["The Blue Note is yours whenever you like."],
    sightRange: 4,
    residency: "jazz",
  },
};

export function getTrainer(id: string): Trainer | undefined {
  return TRAINERS[id];
}
