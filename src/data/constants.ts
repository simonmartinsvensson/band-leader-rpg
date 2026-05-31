// Core, content-agnostic constants. Actual game *content* (musicians, genres,
// techniques, maps) is data-driven and lives alongside this file in src/data.

/** Edge length of one tile, in source pixels. The whole game is built on a 16x16 grid. */
export const TILE_SIZE = 16;

/** Logical render resolution (GBA-like). Phaser scales this up to fill the viewport. */
export const GAME_WIDTH = 240;
export const GAME_HEIGHT = 160;

/** Placeholder dark background colour for the canvas. */
export const BACKGROUND_COLOR = "#0b0b12";
