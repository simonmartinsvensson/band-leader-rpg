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
    // Rival band leader: now a story NPC. Interacting (once the intro is done)
    // plays the "meet the rival" cutscene, which runs the actual battle; after
    // that this NPC just shows its post-battle line (dialogue "rival_after").
    obj({
      name: "rival_max",
      type: "npc",
      tx: 5,
      ty: 5,
      props: { dialogue: "rival_after", facing: "down", wander: false, tint: "#e74c3c" },
    }),
    // Monocorp rep: only appears once you've met the rival (flag-gated), and
    // interacting plays the "Monocorp sighting" cutscene.
    obj({
      name: "monocorp_agent",
      type: "npc",
      tx: 16,
      ty: 9,
      props: { dialogue: "monocorp_after", facing: "down", wander: false, tint: "#5a6b8c", requires: "story.met_rival" },
    }),
    // Warp to the jazz venue (The Blue Note); arrive back here from it.
    obj({ name: "to_jazz", type: "warp", tx: 1, ty: 1, props: { target: "jazz_club", entry: "from_town" } }),
    obj({ name: "from_jazz", type: "entry", tx: 2, ty: 1 }),
    // Warp east to the riverside park (and on to the warehouse venue).
    obj({ name: "to_park", type: "warp", tx: 28, ty: 11, props: { target: "park", entry: "from_town" } }),
    obj({ name: "from_park", type: "entry", tx: 27, ty: 11 }),
    // --- District gates (visible-but-locked until you earn the residency) ---
    // Rock Strip + Folk Riverside open once you hold the Jazz Residency.
    obj({ name: "to_rock", type: "gate", tx: 28, ty: 5, props: { requires: "jazz", target: "rock_route", entry: "from_town" } }),
    obj({ name: "from_rock", type: "entry", tx: 27, ty: 5 }),
    obj({ name: "to_folk", type: "gate", tx: 28, ty: 17, props: { requires: "jazz", target: "folk_route", entry: "from_town" } }),
    obj({ name: "from_folk", type: "entry", tx: 27, ty: 17 }),
    // Funk Block + Classical Hall open once you hold the Warehouse (electronic) Residency.
    obj({ name: "to_funk", type: "gate", tx: 18, ty: 18, props: { requires: "electronic", target: "funk_route", entry: "from_town" } }),
    obj({ name: "from_funk", type: "entry", tx: 18, ty: 17 }),
    obj({ name: "to_classical", type: "gate", tx: 24, ty: 18, props: { requires: "electronic", target: "classical_route", entry: "from_town" } }),
    obj({ name: "from_classical", type: "entry", tx: 24, ty: 17 }),
    // Monocorp Tower (the finale) looms over downtown — always enterable, but
    // The Chairman turns you away until you hold every residency.
    obj({ name: "to_tower", type: "warp", tx: 20, ty: 1, props: { target: "monocorp_hq", entry: "from_town" } }),
    obj({ name: "from_tower", type: "entry", tx: 20, ty: 2 }),
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
    obj({ name: "poster_busk", type: "lore", tx: 16, ty: 12, props: { lore: "poster_busk" } }),
    // Sidequest givers (downtown): the record collector + the mixtape kid.
    obj({ name: "sq_collector", type: "npc", tx: 8, ty: 3, props: { dialogue: "sq_collector", facing: "left", wander: false, tint: "#c9a227" } }),
    obj({ name: "sq_sender", type: "npc", tx: 8, ty: 11, props: { dialogue: "sq_sender", facing: "left", wander: false, tint: "#7cc4ff" } }),
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
    obj({ name: "note_studio", type: "lore", tx: 11, ty: 7, props: { lore: "note_studio" } }),
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
    // Signature encounter zone: the old scene's echoes (rare: Cassette).
    obj({ name: "backstage_zone", type: "encounter", tx: 2, ty: 1, tw: 5, th: 4, props: { zone: "blue_note_backstage" } }),
    obj({ name: "record_vip", type: "lore", tx: 6, ty: 4, props: { lore: "record_vip" } }),
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
    obj({ name: "note_park", type: "lore", tx: 4, ty: 12, props: { lore: "note_park" } }),
    // Sidequest: the park ringer (the "Prove It" battle challenge).
    obj({ name: "sq_ringer_npc", type: "npc", tx: 6, ty: 5, props: { dialogue: "sq_ringer", facing: "down", wander: false, tint: "#e67e22" } }),
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
    // Signature encounter zone: warehouse after-hours (rare: Aurora).
    obj({ name: "afterhours_zone", type: "encounter", tx: 2, ty: 1, tw: 5, th: 4, props: { zone: "warehouse_afterhours" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "backstage-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote backstage-map.json (backstage, ${W}x${H})`);
}

// =============================================================================
// GENRE DISTRICTS — the world beyond downtown. Each district is a connecting
// ROUTE (with its own genre encounter zone) + a town HUB (a gear stall, a local
// or two, a rehearsal heal point, and a sign marking where the district's VENUE
// opens in Phase 5). Districts are reached from town through a residency GATE,
// so later ones are visible-but-locked until you earn the right residency.
// A shared helper keeps every district the same clean shape (see CLAUDE.md).
//
//   town --[gate: requires residency]--> <genre>_route --> <genre>_hub --> (venue, Phase 5)
//
// `cfg`: { genre, routeKey, hubKey, routeFile, hubFile, zoneId, townReturnEntry,
//          localDialogue, venueSignDialogue, flavorTint }
function buildDistrict(cfg) {
  // ROUTE: a path west(town) -> east(hub) through a genre encounter zone.
  {
    nextObjectId = 1;
    const W = 20;
    const H = 14;
    const at = (x, y) => y * W + x;
    const ground = new Array(W * H).fill(GRASS);
    for (let x = 1; x < W - 1; x++) ground[at(x, 7)] = PATH;
    const collision = new Array(W * H).fill(0);
    border(collision, W, H);
    const objects = [
      obj({ name: "from_town", type: "entry", tx: 2, ty: 7 }),
      obj({ name: "to_town", type: "warp", tx: 1, ty: 7, props: { target: "town", entry: cfg.townReturnEntry } }),
      obj({ name: "from_hub", type: "entry", tx: 17, ty: 7 }),
      obj({ name: "to_hub", type: "warp", tx: 18, ty: 7, props: { target: cfg.hubKey, entry: "from_route" } }),
      obj({ name: `${cfg.zoneId}_zone`, type: "encounter", tx: 2, ty: 4, tw: 16, th: 7, props: { zone: cfg.zoneId } }),
      // A recurring Monocorp A&R rep ambushing the route (appears once the gating
      // flag is set; line-of-sight battle). Deepens the antagonist district by
      // district. (Off the path, facing it, so it catches you as you pass.)
      ...(cfg.arRep
        ? [
            obj({
              name: cfg.arRep.trainer,
              type: "trainer",
              tx: 10,
              ty: 5,
              props: { trainer: cfg.arRep.trainer, facing: "down", tint: "#5a6b8c", requires: cfg.arRep.requires },
            }),
          ]
        : []),
    ];
    const map = makeMap(W, H, [
      tileLayer(1, "ground", W, H, ground),
      tileLayer(2, "collision", W, H, collision),
      { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
    ]);
    writeFileSync(resolve(OUT_DIR, cfg.routeFile), JSON.stringify(map, null, 2) + "\n");
    console.log(`Wrote ${cfg.routeFile} (${cfg.routeKey}, ${W}x${H})`);
  }

  // HUB: a small plaza with a shop, a local, a rehearsal heal point, and the
  // future-venue sign. Enter from the route (south), leave back to it.
  {
    nextObjectId = 1;
    const W = 18;
    const H = 12;
    const at = (x, y) => y * W + x;
    const ground = new Array(W * H).fill(GRASS);
    for (let x = 1; x < W - 1; x++) ground[at(x, 10)] = PATH; // main street
    for (let y = 2; y < 11; y++) ground[at(9, y)] = PATH; // plaza spine
    const collision = new Array(W * H).fill(0);
    border(collision, W, H);
    const objects = [
      obj({ name: "from_route", type: "entry", tx: 9, ty: 10 }),
      obj({ name: "to_route", type: "warp", tx: 16, ty: 10, props: { target: cfg.routeKey, entry: "from_hub" } }),
      // Rehearsal studio heal point (top of the spine; face it to use).
      obj({ name: "rehearsal", type: "heal", tx: 9, ty: 2 }),
      // The district's venue. Once built, the headliner boss stands on the stage
      // (interaction-only); until then it's a sign placeholder.
      cfg.hasVenue
        ? obj({
            name: `${cfg.genre}_headliner`,
            type: "trainer",
            tx: 12,
            ty: 6,
            props: { trainer: `${cfg.genre}_headliner`, facing: "down", tint: cfg.flavorTint },
          })
        : obj({
            name: `${cfg.genre}_sign`,
            type: "npc",
            tx: 12,
            ty: 6,
            props: { dialogue: cfg.venueSignDialogue, facing: "down", wander: false, tint: "#9aa0b5" },
          }),
      // Gear stall (shared shop) + a genre local.
      obj({
        name: `${cfg.genre}_shop`,
        type: "npc",
        tx: 4,
        ty: 4,
        props: { dialogue: "gear_stall", facing: "down", wander: false, tint: "#4caf50" },
      }),
      obj({
        name: `${cfg.genre}_local`,
        type: "npc",
        tx: 14,
        ty: 8,
        props: { dialogue: cfg.localDialogue, facing: "left", wander: true, tint: cfg.flavorTint },
      }),
      // The recurring rival drops in during one circuit window (appears between
      // its `requires` and `forbids` flags). Interacting plays that beat.
      ...(cfg.rivalBeat
        ? [
            obj({
              name: cfg.rivalBeat.name,
              type: "npc",
              tx: 6,
              ty: 7,
              props: {
                dialogue: "rival_after",
                facing: "down",
                wander: false,
                tint: "#e74c3c",
                requires: cfg.rivalBeat.requires,
                forbids: cfg.rivalBeat.forbids,
              },
            }),
          ]
        : []),
      // A scattered piece of collectible lore tucked in the corner.
      ...(cfg.lore ? [obj({ name: cfg.lore, type: "lore", tx: 2, ty: 3, props: { lore: cfg.lore } })] : []),
      // An optional sidequest NPC posted in this hub.
      ...(cfg.sqNpc
        ? [obj({ name: cfg.sqNpc.name, type: "npc", tx: 6, ty: 7, props: { dialogue: cfg.sqNpc.dialogue, facing: "down", wander: false, tint: "#27ae60" } })]
        : []),
    ];
    const map = makeMap(W, H, [
      tileLayer(1, "ground", W, H, ground),
      tileLayer(2, "collision", W, H, collision),
      { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
    ]);
    writeFileSync(resolve(OUT_DIR, cfg.hubFile), JSON.stringify(map, null, 2) + "\n");
    console.log(`Wrote ${cfg.hubFile} (${cfg.hubKey}, ${W}x${H})`);
  }
}

// The four new genre districts (jazz + electronic already exist as the
// jazz_club and warehouse areas). Tints come from the genre palette.
const DISTRICTS = [
  // rivalBeat: the rival NPC appears in this hub between `requires` and `forbids`
  //   flags (its interact beat is in src/data/events.ts).
  // arRep: a Monocorp A&R-rep trainer ambushes this route once `requires` is set.
  { genre: "rock", routeKey: "rock_route", hubKey: "rock_hub", routeFile: "rock-route-map.json", hubFile: "rock-hub-map.json", zoneId: "rock_route", townReturnEntry: "from_rock", localDialogue: "rock_local", venueSignDialogue: "rock_venue_sign", flavorTint: "#e74c3c", hasVenue: true,
    rivalBeat: { name: "rival_rock", requires: "story.met_rival", forbids: "story.rival2_done" },
    arRep: { trainer: "ar_rep_strip", requires: "story.jazz_won" }, lore: "poster_strip" },
  { genre: "folk", routeKey: "folk_route", hubKey: "folk_hub", routeFile: "folk-route-map.json", hubFile: "folk-hub-map.json", zoneId: "folk_route", townReturnEntry: "from_folk", localDialogue: "folk_local", venueSignDialogue: "folk_venue_sign", flavorTint: "#27ae60", hasVenue: true, lore: "record_river",
    sqNpc: { name: "sq_recipient", dialogue: "sq_recipient" } },
  { genre: "funk", routeKey: "funk_route", hubKey: "funk_hub", routeFile: "funk-route-map.json", hubFile: "funk-hub-map.json", zoneId: "funk_route", townReturnEntry: "from_funk", localDialogue: "funk_local", venueSignDialogue: "funk_venue_sign", flavorTint: "#e67e22", hasVenue: true,
    rivalBeat: { name: "rival_funk", requires: "story.rival2_done", forbids: "story.rival3_done" },
    arRep: { trainer: "ar_rep_block", requires: "story.electronic_won" }, lore: "poster_block" },
  { genre: "classical", routeKey: "classical_route", hubKey: "classical_hub", routeFile: "classical-route-map.json", hubFile: "classical-hub-map.json", zoneId: "classical_route", townReturnEntry: "from_classical", localDialogue: "classical_local", venueSignDialogue: "classical_venue_sign", flavorTint: "#f1c40f", hasVenue: true,
    rivalBeat: { name: "rival_classical", requires: "story.rival3_done", forbids: "story.rival4_done" },
    arRep: { trainer: "ar_rep_hall", requires: "story.electronic_won" }, lore: "record_hall" },
];
for (const d of DISTRICTS) buildDistrict(d);

// =============================================================================
// MONOCORP_HQ — the Tower lobby + the antagonist (The Chairman). Reached from
// town; the finale gauntlet cutscene fires when you face the Chairman holding
// every residency (see src/data/events.ts "finale_gauntlet").
// =============================================================================
{
  nextObjectId = 1;
  const W = 14;
  const H = 11;
  const at = (x, y) => y * W + x;
  const ground = new Array(W * H).fill(PATH); // polished lobby floor
  for (let x = 4; x <= 9; x++) ground[at(x, 2)] = WATER; // glassy backdrop behind the stage
  const collision = new Array(W * H).fill(0);
  border(collision, W, H);

  const objects = [
    obj({ name: "from_town", type: "entry", tx: 7, ty: 9 }),
    obj({ name: "to_town", type: "warp", tx: 1, ty: 9, props: { target: "town", entry: "from_tower" } }),
    // The Chairman — finale trigger (interaction-only). Locked dialogue until
    // every residency is earned; then the gauntlet cutscene takes over.
    obj({
      name: "monocorp_ceo",
      type: "npc",
      tx: 7,
      ty: 3,
      props: { dialogue: "monocorp_ceo_locked", facing: "down", wander: false, tint: "#2b2f3a" },
    }),
    obj({
      name: "tower_guard",
      type: "npc",
      tx: 3,
      ty: 7,
      props: { dialogue: "tower_guard", facing: "right", wander: false, tint: "#5a6b8c" },
    }),
    obj({ name: "note_tower", type: "lore", tx: 11, ty: 7, props: { lore: "note_tower" } }),
  ];

  const map = makeMap(W, H, [
    tileLayer(1, "ground", W, H, ground),
    tileLayer(2, "collision", W, H, collision),
    { id: 3, name: "objects", type: "objectgroup", opacity: 1, visible: true, x: 0, y: 0, objects },
  ]);
  writeFileSync(resolve(OUT_DIR, "monocorp-hq-map.json"), JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote monocorp-hq-map.json (monocorp_hq, ${W}x${H})`);
}
