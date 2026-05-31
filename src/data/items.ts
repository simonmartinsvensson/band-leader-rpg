import type { StatKey } from "../types/stats";

// Consumable items. Each has an `effect` (what it does) plus where it can be
// used and a shop price. Bag/currency live in the registry; see
// src/systems/inventory.ts for the logic that applies these.

export type ItemEffect =
  | { kind: "recruit"; modifier: number } // boosts audition odds (battle only)
  | { kind: "restoreStamina"; amount: number } // heals a musician's stamina
  | { kind: "boostStat"; stat: StatKey; stages: number }; // raises a stat in battle

export interface Item {
  id: string;
  name: string;
  description: string;
  /** Shop price in currency. */
  price: number;
  usableInBattle: boolean;
  usableInField: boolean;
  effect: ItemEffect;
}

export const ITEMS: Record<string, Item> = {
  demo_tape: {
    id: "demo_tape",
    name: "Demo Tape",
    description: "Boosts the odds of a successful audition.",
    price: 200,
    usableInBattle: true,
    usableInField: false,
    effect: { kind: "recruit", modifier: 2 },
  },
  snack: {
    id: "snack",
    name: "Snack",
    description: "Restores 15 stamina to one musician.",
    price: 40,
    usableInBattle: true,
    usableInField: true,
    effect: { kind: "restoreStamina", amount: 15 },
  },
  energy_drink: {
    id: "energy_drink",
    name: "Energy Drink",
    description: "Restores 50 stamina to one musician.",
    price: 120,
    usableInBattle: true,
    usableInField: true,
    effect: { kind: "restoreStamina", amount: 50 },
  },
  hype_track: {
    id: "hype_track",
    name: "Hype Track",
    description: "Raises a musician's Skill during a performance.",
    price: 250,
    usableInBattle: true,
    usableInField: false,
    effect: { kind: "boostStat", stat: "skill", stages: 1 },
  },
};

export const ITEM_LIST = Object.values(ITEMS);

export function getItem(id: string): Item | undefined {
  return ITEMS[id];
}
