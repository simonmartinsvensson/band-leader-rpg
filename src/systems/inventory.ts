import type { MusicianInstance } from "../types/musician";

/** The bag: item id -> quantity. Stored game-global in the registry ("bag"). */
export type Bag = Record<string, number>;

export function itemCount(bag: Bag, id: string): number {
  return bag[id] ?? 0;
}

export function hasItem(bag: Bag, id: string): boolean {
  return itemCount(bag, id) > 0;
}

export function addItem(bag: Bag, id: string, qty = 1): void {
  bag[id] = itemCount(bag, id) + qty;
}

/** Remove `qty` of an item; returns false (and changes nothing) if not enough. */
export function removeItem(bag: Bag, id: string, qty = 1): boolean {
  if (itemCount(bag, id) < qty) return false;
  bag[id] -= qty;
  if (bag[id] <= 0) delete bag[id];
  return true;
}

/** Non-empty bag contents, as a stable list. */
export function bagEntries(bag: Bag): Array<{ id: string; count: number }> {
  return Object.keys(bag)
    .filter((id) => bag[id] > 0)
    .map((id) => ({ id, count: bag[id] }));
}

/**
 * Restore stamina to a musician (capped at max). Returns the amount actually
 * restored (0 if already full — callers can skip consuming the item then).
 */
export function restoreStamina(instance: MusicianInstance, amount: number): number {
  const before = instance.currentStamina;
  instance.currentStamina = Math.min(instance.stats.stamina, before + amount);
  return instance.currentStamina - before;
}

export function canAfford(currency: number, price: number): boolean {
  return currency >= price;
}
