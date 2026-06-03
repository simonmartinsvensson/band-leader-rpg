// Generates one battle sprite PNG per musician species into public/assets, fully
// procedurally — no external art. Each battler is a humanoid musician figure
// whose palette comes from its genre(s), whose instrument comes from its genre,
// and whose silhouette/hair/pose is varied by a hash of the species id, so every
// species is recognisably distinct yet the whole roster shares one cohesive
// style. Signature species get a subtle glow + sparkle so they read as special.
//
// Re-run with `npm run gen:battlers`. Output: public/assets/battler_<id>.png,
// one 32x32 RGBA frame each (BattleScene draws them at 2x — see CLAUDE.md
// "Asset keys" / "Asset-swap guide"). To swap in real art later, drop a PNG with
// the same `battler_<id>` name + size into public/assets — nothing else changes.
//
// Species + genre data are imported straight from the real game data (Node 26
// strips the TS types), so the battler roster can never drift from src/data.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SPECIES_LIST } from "../src/data/species.ts";
import { GENRES } from "../src/data/genres.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_DIR = resolve(ROOT, "public", "assets");
const SIZE = 32; // battler canvas (BattleScene renders it at 2x = 64px tall)

// Signature species (the very-hard-to-recruit roster tied to special encounter
// zones — see the SIGNATURE section of src/data/species.ts). They get a flourish.
const SIGNATURE_IDS = new Set([
  "cassette",
  "riffraffe",
  "bassolossus",
  "maestrissimo",
  "aurora",
  "undertone",
  "skyline",
]);

// --- Minimal PNG encoder (8-bit RGBA, single IDAT) — same as gen-placeholders --
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

// --- Tiny pixel canvas with alpha compositing ---------------------------------
function canvas(width, height) {
  const buf = Buffer.alloc(width * height * 4); // transparent by default
  return {
    width,
    height,
    buf,
    /** Source-over blend `color` (with alpha 0..255) onto the pixel at x,y. */
    px(x, y, [r, g, b], a = 255) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= width || y >= height || a <= 0) return;
      const i = (y * width + x) * 4;
      const da = buf[i + 3];
      if (a >= 255 || da === 0) {
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = Math.max(da, a);
        return;
      }
      const sa = a / 255;
      const ia = 1 - sa;
      buf[i] = Math.round(r * sa + buf[i] * ia);
      buf[i + 1] = Math.round(g * sa + buf[i + 1] * ia);
      buf[i + 2] = Math.round(b * sa + buf[i + 2] * ia);
      buf[i + 3] = Math.round(a + da * ia);
    },
    rect(x0, y0, w, h, color, a = 255) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.px(x, y, color, a);
    },
  };
}

// --- Color helpers ------------------------------------------------------------
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hexToRgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const shade = ([r, g, b], f) => [clamp(r * f), clamp(g * f), clamp(b * f)];
const mix = (a, b, t) => [
  clamp(a[0] + (b[0] - a[0]) * t),
  clamp(a[1] + (b[1] - a[1]) * t),
  clamp(a[2] + (b[2] - a[2]) * t),
];

const EYE = [30, 26, 34];
const SHOE = [38, 38, 50];
const OUTLINE = [22, 18, 28];

// Skin + hair palettes (hash-chosen per species for variety).
const SKINS = [
  [255, 224, 189],
  [241, 194, 125],
  [224, 172, 105],
  [198, 134, 66],
  [141, 92, 53],
  [94, 64, 46],
];
const HAIRS = [
  [38, 34, 40], // black
  [92, 60, 38], // brown
  [148, 112, 64], // dark blond
  [214, 188, 130], // blond
  [176, 64, 58], // auburn
  [70, 74, 92], // slate
  [186, 188, 196], // grey
];

// One signature instrument per genre (no instrument field on species, so we
// derive a sensible one from the primary genre). Dual-genre uses the primary.
const INSTRUMENT_BY_GENRE = {
  rock: "electric_guitar",
  folk: "acoustic_guitar",
  jazz: "saxophone",
  funk: "bass",
  classical: "violin",
  electronic: "keytar",
};

/** Genre palette family derived from the genre's display color. */
function genrePalette(genreId) {
  const base = hexToRgb(GENRES[genreId].color);
  return {
    main: base,
    dark: shade(base, 0.58),
    light: mix(base, [255, 255, 255], 0.4),
    deep: shade(base, 0.42),
  };
}

/** Outfit palette for a species: blend the two colors for dual-genre. */
function outfitPalette(genres) {
  const a = genrePalette(genres[0]);
  if (genres.length < 2) return a;
  const b = genrePalette(genres[1]);
  const main = mix(a.main, b.main, 0.5);
  return {
    main,
    dark: shade(main, 0.58),
    light: mix(main, [255, 255, 255], 0.4),
    deep: shade(main, 0.42),
  };
}

// --- Deterministic per-species variation --------------------------------------
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFrom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const HAIR_STYLES = ["short", "long", "mohawk", "cap", "fedora", "bun", "spiky", "bald"];

// --- Instrument motifs (drawn in front of the torso) --------------------------
function drawInstrument(cv, kind, genre, flip) {
  const cx = 16;
  // genre accent for strings/keys highlights
  const accent = genrePalette(genre).light;
  const wood = [150, 96, 52];
  const woodDark = [104, 64, 34];
  const woodLight = [196, 140, 88];
  const metal = [220, 188, 96];
  const metalDark = [168, 138, 60];

  // sx is the horizontal mirror helper so poses can face either way.
  const sx = (x) => (flip ? 2 * cx - x : x);

  switch (kind) {
    case "electric_guitar": {
      // Pointed body lower-front, thin neck up to the off-shoulder.
      const body = [54, 56, 66];
      const bodyHi = [92, 96, 110];
      // body (angular)
      cv.rect(sx(15), 21, 9, 6, body);
      cv.rect(sx(17), 19, 6, 3, body);
      cv.px(sx(23), 27, body);
      cv.rect(sx(16), 22, 3, 2, bodyHi); // pickguard
      cv.rect(sx(18), 23, 5, 1, accent); // strings/pickups accent
      // neck up-left
      for (let i = 0; i < 8; i++) cv.px(sx(16 - i), 20 - i, OUTLINE);
      for (let i = 0; i < 8; i++) cv.px(sx(17 - i), 20 - i, [70, 50, 40]);
      cv.rect(sx(7), 11, 2, 2, [40, 36, 44]); // headstock
      break;
    }
    case "acoustic_guitar": {
      // Rounded warm body + soundhole, wooden neck.
      cv.rect(sx(16), 19, 9, 8, wood);
      cv.rect(sx(15), 21, 11, 4, wood);
      cv.rect(sx(17), 19, 7, 1, woodLight);
      cv.rect(sx(16), 25, 9, 1, woodDark);
      cv.rect(sx(19), 22, 2, 2, [40, 30, 24]); // soundhole
      for (let i = 0; i < 9; i++) cv.px(sx(16 - i), 20 - i, woodDark);
      for (let i = 0; i < 9; i++) cv.px(sx(17 - i), 20 - i, woodLight);
      cv.rect(sx(6), 10, 2, 2, woodDark); // headstock
      break;
    }
    case "saxophone": {
      // Golden tube curving down to a flared bell, in front of the chest.
      cv.rect(sx(17), 13, 2, 9, metal);
      cv.rect(sx(17), 13, 1, 9, metalDark);
      cv.rect(sx(15), 21, 5, 2, metal); // bell elbow
      cv.rect(sx(14), 22, 3, 4, metal); // bell flare
      cv.rect(sx(14), 25, 4, 1, metalDark);
      cv.px(sx(18), 12, [60, 52, 40]); // mouthpiece
      cv.px(sx(18), 15, accent); // key
      cv.px(sx(18), 18, accent);
      break;
    }
    case "bass": {
      // Like a guitar but a longer neck, held low, bright funky body.
      const body = genrePalette(genre).main;
      const bodyDark = genrePalette(genre).deep;
      cv.rect(sx(16), 22, 9, 5, body);
      cv.rect(sx(15), 23, 11, 3, body);
      cv.rect(sx(16), 26, 9, 1, bodyDark);
      cv.rect(sx(18), 23, 5, 1, accent);
      for (let i = 0; i < 11; i++) cv.px(sx(16 - i), 22 - i, OUTLINE);
      for (let i = 0; i < 11; i++) cv.px(sx(17 - i), 22 - i, [60, 60, 70]);
      cv.rect(sx(4), 10, 2, 3, [40, 40, 48]); // headstock
      break;
    }
    case "violin": {
      // Small body tucked under the chin + a thin diagonal bow.
      cv.rect(sx(9), 11, 5, 4, wood);
      cv.rect(sx(9), 11, 5, 1, woodLight);
      cv.rect(sx(10), 14, 3, 1, woodDark);
      cv.px(sx(11), 12, [40, 30, 24]); // f-hole
      for (let i = 0; i < 4; i++) cv.px(sx(13 + i), 10 - i, woodDark); // neck/scroll
      // bow across, light wood
      for (let i = 0; i < 11; i++) cv.px(sx(13 + i), 13 - Math.round(i * 0.5), woodLight);
      break;
    }
    case "keytar": {
      // A slung keytar slab held in front, black with white key teeth.
      const slab = [34, 32, 44];
      cv.rect(sx(13), 20, 12, 4, slab);
      cv.rect(sx(13), 20, 12, 1, [60, 58, 74]);
      for (let i = 0; i < 6; i++) cv.px(sx(14 + i * 2), 22, [232, 232, 240]); // white keys
      cv.rect(sx(23), 21, 2, 2, accent); // glowing accent panel
      cv.px(sx(13), 23, accent);
      break;
    }
  }
}

// --- The figure ---------------------------------------------------------------
function drawBattler(species) {
  const cv = canvas(SIZE, SIZE);
  const r = rngFrom(hashStr(species.id));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];

  const isSig = SIGNATURE_IDS.has(species.id);
  const outfit = outfitPalette(species.genres);
  const skin = pick(SKINS);
  const skinShade = shade(skin, 0.82);
  const hair = pick(HAIRS);
  const build = pick([8, 10, 12]); // torso width
  const style = pick(HAIR_STYLES);
  const flip = r() < 0.5;
  const instrument = INSTRUMENT_BY_GENRE[species.genres[0]] ?? "acoustic_guitar";

  const cx = 16;
  const tw = build;
  const tx = cx - Math.floor(tw / 2);

  // Signature aura: a soft halo behind the figure (drawn first so it sits back).
  if (isSig) {
    const glow = mix(outfit.light, [255, 250, 210], 0.5);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const d = Math.hypot(x - cx, y - 15);
        if (d > 8 && d < 14) cv.px(x, y, glow, clamp(70 * (1 - (d - 8) / 6)));
      }
    }
  }

  // Legs + shoes.
  cv.rect(cx - 4, 24, 3, 5, outfit.dark);
  cv.rect(cx + 1, 24, 3, 5, outfit.dark);
  cv.rect(cx - 4, 24, 1, 5, outfit.deep);
  cv.rect(cx + 1, 24, 1, 5, outfit.deep);
  cv.rect(cx - 5, 29, 4, 2, SHOE);
  cv.rect(cx + 1, 29, 4, 2, SHOE);

  // Arms (skin hands at the ends) — behind the torso/instrument.
  cv.rect(tx - 2, 14, 2, 7, outfit.main);
  cv.rect(tx + tw, 14, 2, 7, outfit.main);
  cv.rect(tx - 2, 21, 2, 2, skin);
  cv.rect(tx + tw, 21, 2, 2, skin);

  // Torso (outfit) with a shaded side + a lighter collar line.
  cv.rect(tx, 14, tw, 10, outfit.main);
  cv.rect(tx + tw - 2, 14, 2, 10, outfit.dark);
  cv.rect(tx, 14, tw, 1, outfit.light);
  // A faint second-genre accent stripe for dual-genre players.
  if (species.genres.length > 1) {
    cv.rect(tx, 18, tw, 1, genrePalette(species.genres[1]).light);
  }

  // Neck + head.
  cv.rect(cx - 1, 13, 3, 1, skinShade);
  cv.rect(12, 5, 8, 8, skin);
  cv.rect(12, 5, 1, 8, skinShade); // cheek shade
  cv.rect(12, 12, 8, 1, skinShade); // jaw
  cv.px(14, 9, EYE);
  cv.px(17, 9, EYE);
  cv.rect(14, 11, 4, 1, skinShade); // mouth shadow

  // Hair / hat.
  drawHair(cv, style, hair, outfit);

  // Instrument in front.
  drawInstrument(cv, instrument, species.genres[0], flip);

  // Signature foreground sparkles.
  if (isSig) {
    const spark = [255, 252, 224];
    sparkle(cv, flip ? 25 : 7, 6);
    cv.px(flip ? 8 : 24, 4, spark, 240);
    cv.px(flip ? 6 : 26, 8, spark, 200);
  }

  return cv;
}

function drawHair(cv, style, hair, outfit) {
  const hairDark = shade(hair, 0.7);
  switch (style) {
    case "short":
      cv.rect(11, 4, 10, 3, hair);
      cv.rect(11, 6, 1, 3, hair);
      cv.rect(20, 6, 1, 3, hair);
      cv.rect(11, 4, 10, 1, hairDark);
      break;
    case "long":
      cv.rect(11, 4, 10, 3, hair);
      cv.rect(11, 6, 1, 7, hair);
      cv.rect(20, 6, 1, 7, hair);
      cv.rect(11, 4, 10, 1, hairDark);
      break;
    case "mohawk":
      cv.rect(15, 1, 2, 6, hair);
      cv.rect(15, 1, 1, 6, hairDark);
      cv.rect(12, 5, 1, 2, hairDark);
      cv.rect(19, 5, 1, 2, hairDark);
      break;
    case "cap":
      cv.rect(11, 3, 10, 3, outfit.main);
      cv.rect(11, 3, 10, 1, outfit.light);
      cv.rect(10, 6, 5, 1, outfit.dark); // brim
      break;
    case "fedora":
      cv.rect(9, 6, 14, 1, hairDark); // brim
      cv.rect(12, 3, 8, 3, hair); // crown
      cv.rect(12, 5, 8, 1, hairDark); // band
      break;
    case "bun":
      cv.rect(11, 4, 10, 3, hair);
      cv.rect(11, 4, 10, 1, hairDark);
      cv.rect(14, 1, 4, 3, hair); // top bun
      cv.rect(14, 1, 4, 1, hairDark);
      break;
    case "spiky":
      cv.rect(11, 4, 10, 2, hair);
      for (let x = 11; x <= 20; x += 2) cv.rect(x, 2, 1, 2, hair);
      cv.rect(11, 4, 10, 1, hairDark);
      break;
    case "bald":
      cv.rect(13, 5, 6, 1, [255, 255, 255], 70); // a faint scalp highlight
      break;
  }
}

function sparkle(cv, x, y) {
  const c = [255, 252, 224];
  cv.px(x, y - 1, c, 230);
  cv.px(x, y + 1, c, 230);
  cv.px(x - 1, y, c, 230);
  cv.px(x + 1, y, c, 230);
  cv.px(x, y, c, 255);
}

// --- Build every battler ------------------------------------------------------
mkdirSync(ASSET_DIR, { recursive: true });

let count = 0;
for (const species of SPECIES_LIST) {
  const cv = drawBattler(species);
  writeFileSync(resolve(ASSET_DIR, `battler_${species.id}.png`), encodePNG(SIZE, SIZE, cv.buf));
  count++;
}

console.log(`Wrote ${count} battler_*.png (${SIZE}x${SIZE}) to ${ASSET_DIR}`);
