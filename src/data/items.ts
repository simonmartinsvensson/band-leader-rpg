// Consumable items. For now just the Demo Tape, which boosts audition odds.

export interface Item {
  id: string;
  name: string;
  /** Multiplier applied to recruit odds when used (see src/systems/recruit.ts). */
  recruitModifier: number;
}

export const ITEMS: Record<string, Item> = {
  demo_tape: { id: "demo_tape", name: "Demo Tape", recruitModifier: 2 },
};

export function getItem(id: string): Item | undefined {
  return ITEMS[id];
}
