import type { MusicianInstance } from "../types/musician";
import { MAX_PARTY } from "./party";

/**
 * Place a newly recruited musician: into the active party if there's room,
 * otherwise into the roster (overflow store for musicians beyond the active 6).
 * Mutates whichever array it adds to; returns where it went.
 */
export function recruit(
  party: MusicianInstance[],
  roster: MusicianInstance[],
  instance: MusicianInstance,
): "party" | "roster" {
  if (party.length < MAX_PARTY) {
    party.push(instance);
    return "party";
  }
  roster.push(instance);
  return "roster";
}
