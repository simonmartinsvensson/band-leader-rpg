// Generates placeholder PNG art into public/assets using only Node built-ins
// (no canvas/imaging deps). Re-run with `npm run gen:assets` whenever you want
// to regenerate the placeholders. Replace these with real art later — keep the
// same dimensions and asset keys (see CLAUDE.md "Asset keys").
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ASSET_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "assets");
const TILE = 16;

// --- Minimal PNG encoder (8-bit RGBA, single IDAT) ----------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Tiny pixel canvas --------------------------------------------------------
function canvas(width, height) {
  const buf = Buffer.alloc(width * height * 4); // transparent by default
  return {
    width,
    height,
    buf,
    px(x, y, [r, g, b, a = 255]) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const i = (y * width + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    },
    rect(x0, y0, w, h, color) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.px(x, y, color);
    },
  };
}

// --- Palette (flat, distinct colors) ------------------------------------------
const C = {
  playerBody: [59, 91, 219],
  npcBody: [224, 49, 49],
  face: [255, 255, 255],
  grass: [92, 184, 92],
  grassDot: [76, 160, 76],
  path: [194, 161, 107],
  pathDot: [170, 140, 90],
  wall: [73, 80, 87],
  wallEdge: [33, 37, 41],
  water: [77, 171, 247],
  waterDot: [51, 150, 230],
};

// A 16x16 character at the given x-offset: 12x12 body + a directional face mark.
function drawChar(cv, ox, body, dir) {
  cv.rect(ox + 2, 2, 12, 12, body);
  const marks = {
    down: [ox + 6, 11, 4, 3],
    up: [ox + 6, 2, 4, 3],
    left: [ox + 2, 6, 3, 4],
    right: [ox + 11, 6, 3, 4],
  };
  cv.rect(...marks[dir], C.face);
}

// A 16x16 tile at the given x-offset: flat base + a sparse accent texture.
function drawTile(cv, ox, base, accent, kind) {
  cv.rect(ox, 0, TILE, TILE, base);
  if (kind === "wall") {
    cv.rect(ox, 0, TILE, 1, C.wallEdge);
    cv.rect(ox, 15, TILE, 1, C.wallEdge);
    cv.rect(ox, 7, TILE, 1, C.wallEdge); // mortar line
    cv.rect(ox + 7, 0, 1, 8, C.wallEdge); // staggered bricks
    cv.rect(ox + 3, 8, 1, 8, C.wallEdge);
    cv.rect(ox + 11, 8, 1, 8, C.wallEdge);
  } else {
    for (const [x, y] of [
      [3, 3],
      [10, 5],
      [6, 11],
      [13, 12],
      [2, 9],
    ]) {
      cv.rect(ox + x, y, 2, 2, accent);
    }
  }
}

// --- Build the three sheets ---------------------------------------------------
mkdirSync(ASSET_DIR, { recursive: true });

const DIRS = ["down", "up", "left", "right"]; // player frame order

const player = canvas(TILE * DIRS.length, TILE);
DIRS.forEach((dir, i) => drawChar(player, i * TILE, C.playerBody, dir));
writeFileSync(resolve(ASSET_DIR, "player.png"), encodePNG(player.width, player.height, player.buf));

const npc = canvas(TILE, TILE);
drawChar(npc, 0, C.npcBody, "down");
writeFileSync(resolve(ASSET_DIR, "npc.png"), encodePNG(npc.width, npc.height, npc.buf));

const TILES = [
  ["grass", C.grass, C.grassDot],
  ["path", C.path, C.pathDot],
  ["wall", C.wall, null],
  ["water", C.water, C.waterDot],
];
const tileset = canvas(TILE * TILES.length, TILE);
TILES.forEach(([kind, base, accent], i) => drawTile(tileset, i * TILE, base, accent, kind));
writeFileSync(resolve(ASSET_DIR, "tileset.png"), encodePNG(tileset.width, tileset.height, tileset.buf));

console.log(`Wrote player.png, npc.png, tileset.png to ${ASSET_DIR}`);
