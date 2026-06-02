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
  /** If set, defeating this trainer sets this story flag (advances the main
   *  objective — see src/data/story.ts). Venue bosses + the finale use this. */
  storyFlag?: string;
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
    defeatLine: ["Beautiful. That's a headliner's sound.", "Word travels fast in this city - go earn the rest."],
    postLine: ["The Blue Note is yours whenever you like."],
    sightRange: 4,
    residency: "jazz",
    storyFlag: "story.jazz_won",
  },
  // The warehouse's opening act — guards the door to the venue floor. A clear
  // step above the rival in town, but below the headliner behind him.
  rival_dex: {
    id: "rival_dex",
    name: "Rival Dex",
    team: [
      { species: "amplifret", level: 11 },
      { species: "voltaxe", level: 12 },
    ],
    reward: 600,
    intro: ["You again? This is MY warehouse now.", "No one reaches the headliner past me."],
    defeatLine: ["Pfft. Fine. Go on through."],
    postLine: ["The floor's that way. Don't embarrass yourself."],
    sightRange: 4,
  },
  warehouse_headliner: {
    id: "warehouse_headliner",
    name: "Headliner Volt",
    team: [
      { species: "synthling", level: 13 },
      { species: "orchestron", level: 13 },
      { species: "synthrax", level: 15 },
    ],
    reward: 1400,
    intro: ["So you cleared the door. Cute.", "Out here the beat never drops. Let's see you keep up."],
    defeatLine: ["...no way. You actually rode that out.", "Monocorp hates a sound they can't quantize. Keep it loud."],
    postLine: ["The Warehouse is yours. The circuit's listening now."],
    sightRange: 4,
    residency: "electronic",
    storyFlag: "story.electronic_won",
  },

  // --- District venue headliners (placed in each district hub) ---
  // Rock Strip — The Amp. Countered by jazz (your Crooner) or folk; the Voltaxe
  // ace half-resists both, so it's not a free win.
  rock_headliner: {
    id: "rock_headliner",
    name: "Headliner Sledge",
    team: [
      { species: "amplifret", level: 13 },
      { species: "rifflet", level: 14 },
      { species: "amplifret", level: 16 },
    ],
    reward: 2000,
    intro: ["The Amp's been dark since Monocorp cut the power to the Strip.", "Plug in and show me there's still teeth in this town!"],
    defeatLine: ["HA! THAT'S the volume I'm talking about.", "The amps are humming again - because of you."],
    postLine: ["Keep the Strip loud, leader."],
    sightRange: 0,
    residency: "rock",
    storyFlag: "story.rock_won",
  },
  // Folk Riverside — The Landing. Countered by electronic or funk (folk is weak
  // to both); a leveled jazz/rock party with no counter struggles.
  folk_headliner: {
    id: "folk_headliner",
    name: "Headliner Wren",
    team: [
      { species: "balladeer", level: 14 },
      { species: "wanderlay", level: 15 },
      { species: "balladeer", level: 17 },
    ],
    reward: 2200,
    intro: ["Pull up a chair by the river.", "No amps to hide behind out here - just the song. Let's hear yours."],
    defeatLine: ["Beautiful. The river will carry that one a long way.", "Monocorp can't silence a tune folks already know by heart."],
    postLine: ["The Landing is yours. Play it forward."],
    sightRange: 0,
    residency: "folk",
    storyFlag: "story.folk_won",
  },
};

export function getTrainer(id: string): Trainer | undefined {
  return TRAINERS[id];
}
