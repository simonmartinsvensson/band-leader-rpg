import type { LoreEntry } from "../data/lore";
import type { Flags } from "./story";

// Pure helpers for the collectible-lore log. Lore "found" state is just story
// flags (so it persists with the save). Unit-tested.

export function isLoreFound(flags: Flags, entry: LoreEntry): boolean {
  return flags[entry.flag] === true;
}

/** The lore entries the player has found so far, in definition order. */
export function foundLore(lore: LoreEntry[], flags: Flags): LoreEntry[] {
  return lore.filter((e) => isLoreFound(flags, e));
}

/** Collection progress, e.g. { found: 3, total: 9 }. */
export function loreProgress(lore: LoreEntry[], flags: Flags): { found: number; total: number } {
  return { found: foundLore(lore, flags).length, total: lore.length };
}
