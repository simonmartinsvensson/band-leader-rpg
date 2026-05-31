/**
 * The four musician stats (band-leader flavored equivalents of the classic
 * RPG stat block). Used both for species base stats and computed instance stats.
 */
export interface Stats {
  /** HP-equivalent: the resource pool depleted in a performance battle. */
  stamina: number;
  /** Attack-equivalent: offensive musicianship. */
  skill: number;
  /** Defense-equivalent: how well damage is shrugged off. */
  composure: number;
  /** Speed-equivalent: determines turn order. */
  tempo: number;
}

export type StatKey = keyof Stats;
