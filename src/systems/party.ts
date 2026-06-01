import type { MusicianInstance } from "../types/musician";
import { createInstance } from "./stats";
import { SPECIES } from "../data/species";

/** Maximum musicians in the player's party. */
export const MAX_PARTY = 6;

/** The starting band. Rifflet is low-level so it level-ups (and learns) early. */
export function createStarterParty(): MusicianInstance[] {
  return [createInstance(SPECIES.rifflet, 5), createInstance(SPECIES.crooner, 8)];
}

export function isFaintedInstance(m: MusicianInstance): boolean {
  return m.currentStamina <= 0;
}

export function isPartyDefeated(party: MusicianInstance[]): boolean {
  return party.length === 0 || party.every(isFaintedInstance);
}

/** Index of the first non-fainted member, or -1 if all have fainted. */
export function firstAliveIndex(party: MusicianInstance[]): number {
  return party.findIndex((m) => !isFaintedInstance(m));
}

export function healInstance(m: MusicianInstance): void {
  m.currentStamina = m.stats.stamina;
}

export function healParty(party: MusicianInstance[]): void {
  for (const m of party) healInstance(m);
}

export function swapMembers(party: MusicianInstance[], i: number, j: number): void {
  if (i < 0 || j < 0 || i >= party.length || j >= party.length || i === j) return;
  const tmp = party[i];
  party[i] = party[j];
  party[j] = tmp;
}
