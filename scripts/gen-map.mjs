// Generates a sample Tiled JSON map into src/data/maps. Re-run with
// `npm run gen:map`. The output is a hand-editable, spec-compliant Tiled map
// (orthogonal, 16x16). Layer names and conventions are documented in CLAUDE.md.
//
// Tileset GIDs (firstgid = 1, tileset.png order): 1 grass, 2 path, 3 wall, 4 water.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "maps");
const TILE = 16;
const W = 30;
const H = 20;

const GRASS = 1;
const PATH = 2;
const WALL = 3;
const WATER = 4;

const idx = (x, y) => y * W + x;

// --- Ground layer: grass everywhere, with a path cross for visual reference ---
const ground = new Array(W * H).fill(GRASS);
for (let x = 1; x < W - 1; x++) ground[idx(x, 10)] = PATH; // horizontal path
for (let y = 1; y < H - 1; y++) ground[idx(5, y)] = PATH; // vertical path

// --- Collision layer: any non-zero cell blocks movement (and renders) ---------
const collision = new Array(W * H).fill(0);
const wall = (x, y) => (collision[idx(x, y)] = WALL);
const water = (x, y) => (collision[idx(x, y)] = WATER);

// Border wall around the whole map.
for (let x = 0; x < W; x++) {
  wall(x, 0);
  wall(x, H - 1);
}
for (let y = 0; y < H; y++) {
  wall(0, y);
  wall(W - 1, y);
}

// A horizontal interior wall and a vertical one to bump into.
for (let x = 8; x <= 14; x++) wall(x, 6);
for (let y = 3; y <= 10; y++) wall(22, y);

// A small solid block.
for (let y = 13; y <= 15; y++) for (let x = 12; x <= 13; x++) wall(x, y);

// A water pond (also blocks).
for (let y = 13; y <= 16; y++) for (let x = 4; x <= 7; x++) water(x, y);

// --- Assemble Tiled JSON ------------------------------------------------------
const tileLayer = (id, name, data) => ({
  id,
  name,
  type: "tilelayer",
  width: W,
  height: H,
  x: 0,
  y: 0,
  opacity: 1,
  visible: true,
  data,
});

const map = {
  type: "map",
  version: "1.10",
  tiledversion: "1.10.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  infinite: false,
  width: W,
  height: H,
  tilewidth: TILE,
  tileheight: TILE,
  nextlayerid: 4,
  nextobjectid: 4,
  tilesets: [
    {
      firstgid: 1,
      name: "placeholder",
      image: "tileset.png",
      imagewidth: 64,
      imageheight: 16,
      tilewidth: TILE,
      tileheight: TILE,
      tilecount: 4,
      columns: 4,
      margin: 0,
      spacing: 0,
    },
  ],
  layers: [
    tileLayer(1, "ground", ground),
    tileLayer(2, "collision", collision),
    {
      id: 3,
      name: "objects",
      type: "objectgroup",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: [
        {
          id: 1,
          name: "player_start",
          type: "spawn",
          // Top-left of tile (3, 3): an open grass cell inside the border.
          x: 3 * TILE,
          y: 3 * TILE,
          width: TILE,
          height: TILE,
          rotation: 0,
          visible: true,
        },
        {
          // Mentor: stationary, faces down, just south of the player's path.
          id: 2,
          name: "mentor",
          type: "npc",
          x: 8 * TILE,
          y: 4 * TILE,
          width: TILE,
          height: TILE,
          rotation: 0,
          visible: true,
          properties: [
            { name: "dialogue", type: "string", value: "mentor" },
            { name: "facing", type: "string", value: "down" },
            { name: "wander", type: "bool", value: false },
          ],
        },
        {
          // Flavor NPC: wanders, tinted so it reads as a different character.
          id: 3,
          name: "busker",
          type: "npc",
          x: 11 * TILE,
          y: 9 * TILE,
          width: TILE,
          height: TILE,
          rotation: 0,
          visible: true,
          properties: [
            { name: "dialogue", type: "string", value: "busker" },
            { name: "facing", type: "string", value: "left" },
            { name: "wander", type: "bool", value: true },
            { name: "tint", type: "string", value: "#7cc4ff" },
          ],
        },
      ],
    },
  ],
};

mkdirSync(OUT_DIR, { recursive: true });
const out = resolve(OUT_DIR, "sample-map.json");
writeFileSync(out, JSON.stringify(map, null, 2) + "\n");
console.log(`Wrote ${out} (${W}x${H})`);
