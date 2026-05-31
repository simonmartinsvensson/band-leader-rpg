// Generates the sample Tiled JSON maps into src/data/maps. Re-run with
// `npm run gen:map`. Outputs are spec-compliant Tiled maps (orthogonal, 16x16).
// Layer names, object types, and conventions are documented in CLAUDE.md.
//
// Tileset GIDs (firstgid = 1, tileset.png order): 1 grass, 2 path, 3 wall, 4 water.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "maps");
const TILE = 16;

const GRASS = 1;
const PATH = 2;
const WALL = 3;
const WATER = 4;

// --- Tiled JSON assembly helpers ---------------------------------------------
const tileLayer = (id, name, W, H, data) => ({
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

let nextObjectId = 1;
const obj = ({ name, type, tx, ty, tw = 1, th = 1, props }) => {
  const o = {
    id: nextObjectId++,
    name,
    type,
    x: tx * TILE,
    y: ty * TILE,
    width: tw * TILE,
    height: th * TILE,
    rotation: 0,
    visible: true,
  };
  if (props) {
    o.properties = Object.entries(props).map(([k, value]) => ({
      name: k,
      type: typeof value === "boolean" ? "bool" : typeof value === "number" ? "int" : "string",
      value,
    }));
  }
  return o;
};

function makeMap(W, H, layers) {
  return {
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
    nextlayerid: layers.length + 1,
    nextobjectid: nextObjectId,
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
    layers,
  };
}

function border(collision, W, H) {
  const idx = (x, y) => y * W + x;
  for (let x = 0; x < W; x++) {
    collision[idx(x, 0)] = WALL;
    collision[idx(x, H - 1)] = WALL;
  }
  for (let y = 0; y < H; y++) {
    collision[idx(0, y)] = WALL;
    collision[idx(W - 1, y)] = WALL;
  }
}

mkdirSync(OUT_DIR, { recursive: true });

// =============================================================================
// TOWN — the starting map: grassy field, mentor + busker NPCs, a warp south to
// the busking street. (Kept compatible with the movement/dialogue smoke test.)
// =============================================================================
{
  nextObjectId = 1;
  const W = 30;
  const H = 20;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(GRASS);
  for (let x = 1; x < W - 1; x++) ground[idx(x, 10)] = PATH;
  for (let y = 1; y < H - 1; y++) ground[idx(5, y)] = PATH;

  const collision = new Array(W * H).fill(0);
  border(collision, W, H);
  for (let x = 8; x <= 14; x++) collision[idx(x, 6)] = WALL;
  for (let y = 3; y <= 10; y++) collision[idx(22, y)] = WALL;
  for (let y = 13; y <= 15; y++) for (let x = 12; x <= 13; x++) collision[idx(x, y)] = WALL;
  for (let y = 13; y <= 16; y++) for (let x = 4; x <= 7; x++) collision[idx(x, y)] = WATER;

  const objects = [
    obj({ name: "player_start", type: "spawn", tx: 3, ty: 3 }),
    obj({
      name: "mentor",
      type: "npc",
      tx: 8,
      ty: 4,
      props: { dialogue: "mentor", facing: "down", wander: false },
    }),
    obj({
      name: "busker",
      type: "npc",
      tx: 11,
      ty: 9,
      props: { dialogue: "busker", facing: "left", wander: true, tint: "#7cc4ff" },
    }),
    // Warp south to the busking street; arrive back here from the street.
    obj({ name: "to_street", type: "warp", tx: 3, ty: 8, props: { target: "street", entry: "from_town" } }),
    obj({ name: "from_street", type: "entry", tx: 3, ty: 7 }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "sample-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote sample-map.json (town, ${W}x${H})`);
}

// =============================================================================
// STREET — the busking street: mostly open, with a large "busking_street"
// encounter region and a warp back north to town.
// =============================================================================
{
  nextObjectId = 1;
  const W = 20;
  const H = 15;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(GRASS);
  for (let y = 1; y < H - 1; y++) ground[idx(3, y)] = PATH; // the street itself

  const collision = new Array(W * H).fill(0);
  border(collision, W, H);

  const objects = [
    obj({ name: "from_town", type: "entry", tx: 3, ty: 2 }),
    // Warp north back to town; arrive back here from town's southern warp.
    obj({ name: "to_town", type: "warp", tx: 3, ty: 1, props: { target: "town", entry: "from_street" } }),
    // Encounter region (covers the street column so walking down enters it).
    obj({
      name: "busking_zone",
      type: "encounter",
      tx: 3,
      ty: 4,
      tw: 9,
      th: 6,
      props: { zone: "busking_street" },
    }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "street-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote street-map.json (street, ${W}x${H})`);
}
