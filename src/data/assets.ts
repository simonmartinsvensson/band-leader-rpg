import { TILE_SIZE } from "./constants";

// Single source of truth for asset keys + load metadata. PreloadScene loads
// these; the rest of the game references content by key. See CLAUDE.md.

/** Loader keys used everywhere in the game. Always reference assets by these. */
export const AssetKeys = {
  PLAYER: "player",
  NPC: "npc",
  TILES: "tiles",
} as const;

/** Player spritesheet frame order (one 16x16 frame per facing direction). */
export const PlayerFrame = {
  DOWN: 0,
  UP: 1,
  LEFT: 2,
  RIGHT: 3,
} as const;

/** Tileset frame indices in tileset.png (16x16 each). */
export const TileFrame = {
  GRASS: 0,
  PATH: 1,
  WALL: 2,
  WATER: 3,
} as const;

/** Spritesheets to load: key -> file + frame size. */
export const SPRITESHEETS = [
  { key: AssetKeys.PLAYER, path: "assets/player.png" },
  { key: AssetKeys.TILES, path: "assets/tileset.png" },
] as const;

/** Single-image assets to load: key -> file. */
export const IMAGES = [{ key: AssetKeys.NPC, path: "assets/npc.png" }] as const;

/** Every placeholder is built on the 16x16 grid. */
export const FRAME_CONFIG = { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE } as const;
