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
    // Roadie (just left of spawn): gifts starter items + cash.
    obj({
      name: "roadie",
      type: "npc",
      tx: 2,
      ty: 3,
      props: { dialogue: "roadie", facing: "right", wander: false, tint: "#f1c40f" },
    }),
    // Shopkeeper (a few tiles right of spawn): opens the gear shop.
    obj({
      name: "shopkeeper",
      type: "npc",
      tx: 6,
      ty: 3,
      props: { dialogue: "shopkeeper", facing: "down", wander: false, tint: "#4caf50" },
    }),
    // Warp south to the busking street; arrive back here from the street.
    obj({ name: "to_street", type: "warp", tx: 3, ty: 8, props: { target: "street", entry: "from_town" } }),
    obj({ name: "from_street", type: "entry", tx: 3, ty: 7 }),
    // Warp east to the rehearsal studio; arrive back here from the studio.
    obj({ name: "to_studio", type: "warp", tx: 10, ty: 1, props: { target: "studio", entry: "studio_entry" } }),
    obj({ name: "from_studio", type: "entry", tx: 10, ty: 2 }),
    // Rival band leader: battles on sight or interaction.
    obj({
      name: "rival_max",
      type: "trainer",
      tx: 5,
      ty: 5,
      props: { trainer: "rival_max", facing: "down", tint: "#e74c3c" },
    }),
    // Warp to the jazz venue (The Blue Note); arrive back here from it.
    obj({ name: "to_jazz", type: "warp", tx: 1, ty: 1, props: { target: "jazz_club", entry: "from_town" } }),
    obj({ name: "from_jazz", type: "entry", tx: 2, ty: 1 }),
    // Warp east to the riverside park (and on to the warehouse venue).
    obj({ name: "to_park", type: "warp", tx: 28, ty: 11, props: { target: "park", entry: "from_town" } }),
    obj({ name: "from_park", type: "entry", tx: 27, ty: 11 }),
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

// =============================================================================
// STUDIO — the rehearsal studio: a small room with a heal point (the "stage")
// and a warp back to town. The defeat path also sends the player here.
// =============================================================================
{
  nextObjectId = 1;
  const W = 14;
  const H = 10;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(GRASS);
  // A path "floor" down the middle leading to the stage.
  for (let y = 2; y < H - 1; y++) ground[idx(7, y)] = PATH;

  const collision = new Array(W * H).fill(0);
  border(collision, W, H);

  const objects = [
    obj({ name: "studio_entry", type: "entry", tx: 7, ty: 6 }),
    obj({ name: "stage", type: "heal", tx: 7, ty: 3 }),
    obj({ name: "to_town", type: "warp", tx: 2, ty: 1, props: { target: "town", entry: "from_studio" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "studio-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote studio-map.json (studio, ${W}x${H})`);
}

// =============================================================================
// JAZZ_CLUB — "The Blue Note" venue: a headliner boss (jazz team) and a
// residency-gated VIP door. Beat the boss to earn the Jazz Residency.
// =============================================================================
{
  nextObjectId = 1;
  const W = 16;
  const H = 12;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(GRASS);
  for (let x = 4; x <= 11; x++) ground[idx(x, 3)] = PATH; // the stage
  ground[idx(7, 2)] = WATER; // blue "notes"
  ground[idx(8, 2)] = WATER;
  for (let y = 4; y < H - 1; y++) ground[idx(8, y)] = PATH; // aisle to the stage

  const collision = new Array(W * H).fill(0);
  border(collision, W, H);

  const objects = [
    obj({ name: "from_town", type: "entry", tx: 8, ty: 10 }),
    // Headliner boss: faces the aisle and challenges on sight.
    obj({
      name: "jazz_headliner",
      type: "trainer",
      tx: 8,
      ty: 4,
      props: { trainer: "jazz_headliner", facing: "down", tint: "#9b59b6" },
    }),
    // VIP door — opens once you hold the Jazz Residency.
    obj({
      name: "vip_door",
      type: "gate",
      tx: 2,
      ty: 2,
      props: { requires: "jazz", target: "vip_lounge", entry: "vip_entry" },
    }),
    obj({ name: "to_town", type: "warp", tx: 14, ty: 10, props: { target: "town", entry: "from_jazz" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "jazz-club-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote jazz-club-map.json (jazz_club, ${W}x${H})`);
}

// =============================================================================
// VIP_LOUNGE — the gated reward area unlocked by the Jazz Residency.
// =============================================================================
{
  nextObjectId = 1;
  const W = 8;
  const H = 6;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(PATH);
  const collision = new Array(W * H).fill(0);
  border(collision, W, H);

  const objects = [
    obj({ name: "vip_entry", type: "entry", tx: 4, ty: 4 }),
    obj({
      name: "vip_host",
      type: "npc",
      tx: 4,
      ty: 2,
      props: { dialogue: "vip_host", facing: "down", wander: false, tint: "#f1c40f" },
    }),
    obj({ name: "to_club", type: "warp", tx: 1, ty: 1, props: { target: "jazz_club", entry: "from_town" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "vip-lounge-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote vip-lounge-map.json (vip_lounge, ${W}x${H})`);
}

// =============================================================================
// PARK — the riverside park east of town: a higher-level "park_path" encounter
// zone (rounds out the roster + the counters for the warehouse), a talent
// scout, a warp back to town, and a warp east to the warehouse venue. A river
// (water) splits the park, crossed by a single path bridge on row 8.
// =============================================================================
{
  nextObjectId = 1;
  const W = 22;
  const H = 16;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(GRASS);
  for (let x = 1; x < W - 1; x++) ground[idx(x, 8)] = PATH; // the walkway / bridge

  const collision = new Array(W * H).fill(0);
  border(collision, W, H);
  // A river down x=11, with the bridge (row 8) left open to cross.
  for (let y = 1; y < H - 1; y++) if (y !== 8) collision[idx(11, y)] = WATER;

  const objects = [
    obj({ name: "from_town", type: "entry", tx: 2, ty: 8 }),
    obj({ name: "to_town", type: "warp", tx: 1, ty: 8, props: { target: "town", entry: "from_park" } }),
    // Talent scout: hints at the warehouse counters (funk/classical vs electronic).
    obj({
      name: "scout",
      type: "npc",
      tx: 4,
      ty: 5,
      props: { dialogue: "park_scout", facing: "down", wander: true, tint: "#1abc9c" },
    }),
    // The park encounter zone (covers the grass either side of the walkway).
    obj({
      name: "park_zone",
      type: "encounter",
      tx: 2,
      ty: 3,
      tw: 18,
      th: 10,
      props: { zone: "park_path" },
    }),
    // Warp east to the warehouse venue; arrive back here from it.
    obj({ name: "from_warehouse", type: "entry", tx: 19, ty: 8 }),
    obj({ name: "to_warehouse", type: "warp", tx: 20, ty: 8, props: { target: "warehouse", entry: "from_park" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "park-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote park-map.json (park, ${W}x${H})`);
}

// =============================================================================
// WAREHOUSE — "The Warehouse" venue (electronic theme), a difficulty step above
// the jazz club. An open floor: a guard rival (the opening act) covers the
// entrance, the headliner waits on the stage, and a residency-gated backstage
// door opens once you hold the Warehouse Residency.
// =============================================================================
{
  nextObjectId = 1;
  const W = 18;
  const H = 13;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(PATH); // a concrete dance floor
  for (let x = 5; x <= 12; x++) ground[idx(x, 2)] = WATER; // neon strip behind the stage

  const collision = new Array(W * H).fill(0);
  border(collision, W, H);
  // Speaker stacks flanking the stage (decor + solid), clear of the aisle.
  collision[idx(4, 2)] = WALL;
  collision[idx(13, 2)] = WALL;

  const objects = [
    obj({ name: "from_park", type: "entry", tx: 9, ty: 11 }),
    obj({ name: "from_backstage", type: "entry", tx: 3, ty: 3 }),
    // Guard rival (opening act): faces the entrance and challenges on sight. The
    // floor is open, so you can pass once he's beaten (he keeps his tile).
    obj({
      name: "rival_dex",
      type: "trainer",
      tx: 9,
      ty: 9,
      props: { trainer: "rival_dex", facing: "down", tint: "#e67e22" },
    }),
    // Headliner boss on the stage; grants the Warehouse Residency.
    obj({
      name: "warehouse_headliner",
      type: "trainer",
      tx: 9,
      ty: 3,
      props: { trainer: "warehouse_headliner", facing: "down", tint: "#1abc9c" },
    }),
    // Backstage door — opens once you hold the Warehouse Residency.
    obj({
      name: "backstage_door",
      type: "gate",
      tx: 3,
      ty: 2,
      props: { requires: "electronic", target: "backstage", entry: "backstage_entry" },
    }),
    obj({ name: "to_park", type: "warp", tx: 16, ty: 11, props: { target: "park", entry: "from_warehouse" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "warehouse-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote warehouse-map.json (warehouse, ${W}x${H})`);
}

// =============================================================================
// BACKSTAGE — the gated reward area unlocked by the Warehouse Residency.
// =============================================================================
{
  nextObjectId = 1;
  const W = 8;
  const H = 6;
  const idx = (x, y) => y * W + x;

  const ground = new Array(W * H).fill(PATH);
  const collision = new Array(W * H).fill(0);
  border(collision, W, H);

  const objects = [
    obj({ name: "backstage_entry", type: "entry", tx: 4, ty: 4 }),
    obj({
      name: "backstage_host",
      type: "npc",
      tx: 4,
      ty: 2,
      props: { dialogue: "backstage_host", facing: "down", wander: false, tint: "#f1c40f" },
    }),
    obj({ name: "to_warehouse", type: "warp", tx: 1, ty: 1, props: { target: "warehouse", entry: "from_backstage" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "backstage-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote backstage-map.json (backstage, ${W}x${H})`);
}
