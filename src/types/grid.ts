/**
 * The grid contract the Player needs to move/collide. Implemented by GameMap;
 * kept as a tiny interface so the Player stays engine-agnostic and testable.
 */
export interface WorldGrid {
  /** Map width in tiles. */
  readonly cols: number;
  /** Map height in tiles. */
  readonly rows: number;
  /** True if the given tile cannot be entered (wall, water, out of bounds). */
  isBlocked(tileX: number, tileY: number): boolean;
}
