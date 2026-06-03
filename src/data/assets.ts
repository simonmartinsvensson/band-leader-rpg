import { TILE_SIZE } from "./constants";
import { SPECIES_LIST } from "./species";

// Single source of truth for asset keys + load metadata. PreloadScene loads
// these; the rest of the game references content by key. See CLAUDE.md.

/** Loader keys used everywhere in the game. Always reference assets by these. */
export const AssetKeys = {
  PLAYER: "player",
  NPC: "npc",
  /** Outdoor (placeholder) tileset — grass/path/wall/water (see TileFrame). */
  TILES: "tiles",
  /** Interior tileset — real LimeZu floors/walls/decor (see InteriorTile). */
  TILES_INTERIOR: "tiles_interior",
  /** Bitmap-font atlas image. Loaded early in BootScene (see src/ui/font.ts). */
  FONT: "font",
  /** A single 16x32 LimeZu door, drawn over building/venue warps (see DOOR_FRAME). */
  DOOR: "door",
} as const;

/** Player spritesheet frame order (one 16x16 frame per facing direction). */
export const PlayerFrame = {
  DOWN: 0,
  UP: 1,
  LEFT: 2,
  RIGHT: 3,
} as const;

/**
 * Overworld character spritesheets — real art from LimeZu's "Modern Interiors
 * (free)" pack, repacked by `scripts/repack-characters.py` (`npm run
 * gen:characters`). Each frame is 16x32 (a character is one tile wide, two tall:
 * it stands on its bottom 16x16 tile, head overhanging the tile above), laid out
 * 7 cols x 4 rows — see `CHARACTER_FRAME` + `src/ui/characterAnims.ts` for the
 * idle/walk frame layout. The `player`/`npc` placeholder keys below are kept only
 * for the battle musician sprites (still placeholders — next job).
 */
export const CharacterKeys = {
  ADAM: "char_adam",
  ALEX: "char_alex",
  AMELIA: "char_amelia",
  BOB: "char_bob",
} as const;

/** Frame size of the LimeZu overworld characters (taller than a tile). */
export const CHARACTER_FRAME = { frameWidth: 16, frameHeight: 32 } as const;

/** Character spritesheets to load (16x32 frames). */
export const CHARACTER_SHEETS = Object.values(CharacterKeys).map((key) => ({
  key,
  path: `assets/${key}.png`,
})) as ReadonlyArray<{ key: string; path: string }>;

/** Tileset frame indices in tileset.png (16x16 each). */
export const TileFrame = {
  GRASS: 0,
  PATH: 1,
  WALL: 2,
  WATER: 3,
} as const;

/**
 * Interior tileset frame indices in tileset_interior.png (16x16 each), generated
 * by `scripts/gen-tiles-interior.py` (`npm run gen:tiles-interior`) from the
 * LimeZu interior pack. Used by the INTERIOR maps (venues, the studio, the VIP
 * lounge, backstage, the Cellar/Loft, the Tower lobby) to retexture floors/walls
 * with real art; outdoor maps stay on `tiles` above. The map GID a layer
 * references is `index + 1` (firstgid = 1). This order is the contract — it is
 * mirrored in `scripts/gen-tiles-interior.py` and `scripts/gen-map.mjs` (the `IT`
 * GID constants). Change one, change all three.
 */
export const InteriorTile = {
  FLOOR_WOOD: 0,
  FLOOR_BRICK: 1,
  FLOOR_CONCRETE: 2,
  FLOOR_CREAM: 3,
  FLOOR_TEAL: 4,
  FLOOR_MARBLE: 5,
  WALL_WOOD: 6,
  WALL_BLUE: 7,
  WALL_TAN: 8,
  WALL_PEACH: 9,
  WALL_MINT: 10,
  RUG: 11,
  SPOTLIGHT: 12,
  PLANT: 13,
  SHELF: 14,
  SOFA: 15,
  ART: 16,
  FIRE: 17,
} as const;

/**
 * Maps a Tiled tileset's embedded `name` to the loaded texture key it links to.
 * `GameMap` uses this to bind every tileset a map declares, so a map can pick its
 * look by naming the tileset: outdoor maps embed `placeholder` (-> `tiles`),
 * interior maps embed `interior` (-> `tiles_interior`). Add a tileset by adding a
 * texture key here + loading it in SPRITESHEETS.
 */
export const TILESET_TEXTURES: Record<string, string> = {
  placeholder: AssetKeys.TILES,
  interior: AssetKeys.TILES_INTERIOR,
};

/** Spritesheets to load: key -> file + frame size. */
export const SPRITESHEETS = [
  { key: AssetKeys.PLAYER, path: "assets/player.png" },
  { key: AssetKeys.TILES, path: "assets/tileset.png" },
  { key: AssetKeys.TILES_INTERIOR, path: "assets/tileset_interior.png" },
] as const;

/** Single-image assets to load: key -> file. */
export const IMAGES = [
  { key: AssetKeys.NPC, path: "assets/npc.png" },
  { key: AssetKeys.DOOR, path: "assets/door.png" },
] as const;

/**
 * The door sprite is 16 wide x 32 tall (one tile wide, two tall) — the real art
 * occupies its lower ~21px so it reads as a door standing on the floor. It's
 * drawn foot-anchored (origin 0.5, 1) in the wall tile beside a building/venue
 * warp, so it sits IN the wall like a real entrance. Sliced from the LimeZu pack
 * by `scripts/gen-tiles-interior.py`. Keep this size if swapping in new art.
 */
export const DOOR_FRAME = { width: 16, height: 32 } as const;

/**
 * Per-species battle sprites: one 32x32 PNG per musician species, generated
 * procedurally from species + genre data by `scripts/gen-battlers.mjs` (`npm run
 * gen:battlers`). The key is `battler_<speciesId>`; BattleScene looks it up via
 * `battlerKey(speciesId)`. Derived from SPECIES_LIST so it can never drift from
 * the roster. To swap in real art, drop a same-named 32x32 PNG into
 * public/assets — nothing else changes (see CLAUDE.md "Asset-swap guide").
 */
export const battlerKey = (speciesId: string): string => `battler_${speciesId}`;

/** Battler images to load: one per species. */
export const BATTLERS = SPECIES_LIST.map((s) => ({
  key: battlerKey(s.id),
  path: `assets/${battlerKey(s.id)}.png`,
})) as ReadonlyArray<{ key: string; path: string }>;

/**
 * The bitmap-font atlas. Loaded separately (and first) in BootScene rather than
 * via IMAGES, so even PreloadScene's loading bar can render crisp text. Kept
 * here so the font path lives with every other asset path (no literal paths in
 * scene code — swaps stay drop-in).
 */
export const FONT_IMAGE = { key: AssetKeys.FONT, path: "assets/font.png" } as const;

/** Every placeholder is built on the 16x16 grid. */
export const FRAME_CONFIG = { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE } as const;

/**
 * Audio loader keys. Music is per-area (looping); SFX are one-shots. The files
 * are placeholder chiptune WAVs from `scripts/gen-audio.mjs` (`npm run
 * gen:audio`). To use real audio, drop files with these same keys into
 * public/assets/audio/ — the game references sounds only by key. See CLAUDE.md.
 */
export const AudioKeys = {
  MUSIC_OVERWORLD: "music_overworld",
  MUSIC_BATTLE: "music_battle",
  MUSIC_VENUE: "music_venue",
  SFX_MOVE: "sfx_move",
  SFX_CONFIRM: "sfx_confirm",
  SFX_CANCEL: "sfx_cancel",
  SFX_HIT: "sfx_hit",
  SFX_FAINT: "sfx_faint",
  SFX_LEVELUP: "sfx_levelup",
  SFX_RECRUIT: "sfx_recruit",
} as const;

/** Audio assets to load: key -> file (under public/assets/audio). */
export const AUDIO = Object.values(AudioKeys).map((key) => ({
  key,
  path: `assets/audio/${key}.wav`,
})) as ReadonlyArray<{ key: string; path: string }>;
