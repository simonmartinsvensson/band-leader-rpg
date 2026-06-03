import Phaser from "phaser";
import { TILE_SIZE } from "../data/constants";
import { TILESET_TEXTURES } from "../data/assets";
import type { WorldGrid } from "../types/grid";

/** Layer / object naming conventions for maps (see CLAUDE.md). */
const GROUND_LAYER = "ground";
/** Optional, non-blocking visual layer (rugs, furniture) drawn over the ground. */
const DECOR_LAYER = "decor";
const COLLISION_LAYER = "collision";
const OBJECTS_LAYER = "objects";

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

    // Link every tileset the map declares to its loaded texture by name (see
    // TILESET_TEXTURES): outdoor maps use `placeholder`, interiors use `interior`.
    const tilesets = this.map.tilesets.map((ts) => {
      const texture = TILESET_TEXTURES[ts.name];
      if (!texture) {
        throw new Error(`Map '${key}': no texture registered for tileset '${ts.name}'`);
      }
      const linked = this.map.addTilesetImage(ts.name, texture, TILE_SIZE, TILE_SIZE);
      if (!linked) {
        throw new Error(`Map '${key}': tileset '${ts.name}' could not be linked to a texture`);
      }
      return linked;
    });

    this.map.createLayer(GROUND_LAYER, tilesets, 0, 0);
    // Optional decor layer (rugs/furniture); purely visual, never blocks. Missing
    // on most maps -> createLayer returns null, which we ignore.
    this.map.createLayer(DECOR_LAYER, tilesets, 0, 0);
    const collisionLayer = this.map.createLayer(COLLISION_LAYER, tilesets, 0, 0);

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

  /** All objects from the "objects" layer, with tile coords + flattened props. */
  getObjects(): MapObject[] {
    const layer = this.map.getObjectLayer(OBJECTS_LAYER);
    if (!layer) return [];
    return layer.objects.map((o) => {
      const props: Record<string, string | number | boolean> = {};
      for (const p of (o.properties ?? []) as Array<{ name: string; value: unknown }>) {
        props[p.name] = p.value as string | number | boolean;
      }
      return {
        name: o.name ?? "",
        type: o.type ?? "",
        tileX: Math.floor((o.x ?? 0) / TILE_SIZE),
        tileY: Math.floor((o.y ?? 0) / TILE_SIZE),
        tileW: Math.max(1, Math.round((o.width ?? TILE_SIZE) / TILE_SIZE)),
        tileH: Math.max(1, Math.round((o.height ?? TILE_SIZE) / TILE_SIZE)),
        props,
      };
    });
  }
}

/** A parsed object from the map's "objects" layer. */
export interface MapObject {
  name: string;
  /** Tiled object "type"/class (e.g. "npc", "warp", "encounter"). */
  type: string;
  /** Top-left tile of the object. */
  tileX: number;
  tileY: number;
  /** Size in tiles (1×1 for point/marker objects, larger for region rectangles). */
  tileW: number;
  tileH: number;
  props: Record<string, string | number | boolean>;
}
