import Phaser from "phaser";
import { TILE_SIZE } from "../data/constants";
import { AssetKeys } from "../data/assets";
import type { WorldGrid } from "../types/grid";

/** Layer / object naming conventions for maps (see CLAUDE.md). */
const GROUND_LAYER = "ground";
const COLLISION_LAYER = "collision";
const OBJECTS_LAYER = "objects";
/** Tileset name inside the Tiled JSON; linked to the loaded tileset texture. */
const TILESET_NAME = "placeholder";

/**
 * Loads and renders a Tiled JSON map and exposes the grid info the Player needs.
 *
 * Map data lives in `src/data/maps` and is imported as JSON (data-driven), then
 * handed to Phaser's tilemap parser. The "ground" and "collision" tile layers
 * are rendered; any non-empty tile in the collision layer blocks movement.
 * Spawn points come from named objects in the "objects" layer.
 */
export class GameMap implements WorldGrid {
  readonly cols: number;
  readonly rows: number;
  readonly widthInPixels: number;
  readonly heightInPixels: number;

  private readonly map: Phaser.Tilemaps.Tilemap;
  private readonly blocked: boolean[];

  constructor(scene: Phaser.Scene, key: string, data: object) {
    if (!scene.cache.tilemap.has(key)) {
      scene.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data });
    }

    this.map = scene.make.tilemap({ key });
    this.cols = this.map.width;
    this.rows = this.map.height;
    this.widthInPixels = this.map.widthInPixels;
    this.heightInPixels = this.map.heightInPixels;

    const tileset = this.map.addTilesetImage(TILESET_NAME, AssetKeys.TILES, TILE_SIZE, TILE_SIZE);
    if (!tileset) {
      throw new Error(`Map '${key}': tileset '${TILESET_NAME}' could not be linked to a texture`);
    }

    this.map.createLayer(GROUND_LAYER, tileset, 0, 0);
    const collisionLayer = this.map.createLayer(COLLISION_LAYER, tileset, 0, 0);

    // Build a flat blocked-tile lookup from the collision layer: any cell that
    // holds a tile (index !== -1) is impassable.
    this.blocked = new Array(this.cols * this.rows).fill(false);
    collisionLayer?.forEachTile((tile) => {
      if (tile.index !== -1) this.blocked[tile.y * this.cols + tile.x] = true;
    });
  }

  isBlocked(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.cols || tileY >= this.rows) return true;
    return this.blocked[tileY * this.cols + tileX];
  }

  /** Tile coordinates of a named object in the "objects" layer. */
  getSpawn(name: string): { x: number; y: number } {
    const obj = this.map.findObject(OBJECTS_LAYER, (o) => o.name === name);
    if (!obj || obj.x == null || obj.y == null) {
      throw new Error(`Spawn '${name}' not found in '${OBJECTS_LAYER}' layer`);
    }
    return { x: Math.floor(obj.x / TILE_SIZE), y: Math.floor(obj.y / TILE_SIZE) };
  }
}
