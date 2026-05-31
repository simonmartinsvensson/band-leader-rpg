import type { MusicianInstance } from "../types/musician";
import type { Trainer } from "../data/trainers";
import { getSpecies } from "../data/species";
import { createInstance } from "./stats";
import { DIRECTION_VECTORS, type Direction } from "../types/direction";

// Career progression: defeated-trainer tracking, residencies, line-of-sight,
// and building a trainer's team of instances. Pure + testable; the registry
// holds the actual state (see OverworldScene).

export function isTrainerDefeated(defeated: Record<string, boolean>, id: string): boolean {
  return defeated[id] === true;
}

export function markTrainerDefeated(defeated: Record<string, boolean>, id: string): void {
  defeated[id] = true;
}

export function hasResidency(residencies: string[], id: string): boolean {
  return residencies.includes(id);
}

export function addResidency(residencies: string[], id: string): void {
  if (!residencies.includes(id)) residencies.push(id);
}

/** Build a trainer's team as live MusicianInstances (skips unknown species). */
export function buildTrainerTeam(trainer: Trainer): MusicianInstance[] {
  return trainer.team
    .map((m) => {
      const species = getSpecies(m.species);
      return species ? createInstance(species, m.level) : null;
    })
    .filter((m): m is MusicianInstance => m !== null);
}

/**
 * True if a trainer at (tx,ty) facing `facing` can see a target at (px,py)
 * within `range` tiles along its facing line, with no blocking tile between.
 */
export function lineOfSight(
  tx: number,
  ty: number,
  facing: Direction,
  range: number,
  px: number,
  py: number,
  isBlocked: (x: number, y: number) => boolean,
): boolean {
  const v = DIRECTION_VECTORS[facing];
  for (let i = 1; i <= range; i++) {
    const cx = tx + v.x * i;
    const cy = ty + v.y * i;
    if (cx === px && cy === py) return true;
    if (isBlocked(cx, cy)) return false; // a wall breaks the sight line
  }
  return false;
}
