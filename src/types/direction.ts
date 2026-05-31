/** The four cardinal facings/movement directions used across the game. */
export type Direction = "up" | "down" | "left" | "right";

/** Unit grid step (in tiles) for each direction. */
export const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
