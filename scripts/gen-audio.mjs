// Generates placeholder sound effects + music loops into public/assets/audio
// using only Node built-ins (no audio deps) — synthesised square/triangle/noise
// tones written as 16-bit PCM WAV. Re-run with `npm run gen:audio`.
//
// These are intentionally simple chiptune placeholders. To swap in real audio:
// drop files with the SAME keys (see src/data/assets.ts AudioKeys) into
// public/assets/audio/ — any browser-playable format works (.mp3/.ogg/.wav).
// Keep the keys; the game references sounds only by key. See CLAUDE.md "Audio".
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "assets", "audio");
const RATE = 11025; // lo-fi placeholder sample rate (Nyquist ~5.5kHz, plenty for blips)

// --- WAV encoding (mono, 16-bit PCM) -----------------------------------------
function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((s * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// --- Synthesis helpers --------------------------------------------------------
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function osc(type, phase) {
  switch (type) {
    case "square":
      return phase % 1 < 0.5 ? 1 : -1;
    case "triangle":
      return 4 * Math.abs((phase % 1) - 0.5) - 1;
    case "saw":
      return 2 * (phase % 1) - 1;
    case "noise":
      return Math.random() * 2 - 1;
    default:
      return Math.sin(phase * 2 * Math.PI);
  }
}

// Render one note into `out` starting at sample `start`. A short attack/release
// envelope keeps every note click-free (so music loops cleanly too).
function renderNote(out, start, freq, ms, { type = "square", gain = 0.5, decay = false } = {}) {
  const len = Math.floor((ms / 1000) * RATE);
  const atk = Math.min(len, Math.floor(RATE * 0.004));
  const rel = Math.min(len, Math.floor(RATE * 0.02));
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= out.length) break;
    let env = 1;
    if (i < atk) env = i / atk;
    else if (i > len - rel) env = (len - i) / rel;
    if (decay) env *= 1 - i / len; // percussive falloff
    out[idx] += osc(type, (freq * i) / RATE) * gain * env;
  }
}

const dir = (key) => resolve(OUT_DIR, `${key}.wav`);
function write(key, samples) {
  writeFileSync(dir(key), encodeWav(samples));
  console.log(`Wrote ${key}.wav (${(samples.length / RATE).toFixed(2)}s)`);
}

mkdirSync(OUT_DIR, { recursive: true });

// --- Music loops (looping arpeggios over a simple chord progression) ----------
// Each track: a bassline (triangle) + an arpeggiated lead (square). Lengths are
// whole bars so the loop is seamless.
function buildMusic({ bpm, prog, leadType = "square", leadGain = 0.22, bassGain = 0.3, arpDiv = 4 }) {
  const beat = 60000 / bpm; // ms per beat
  const barMs = beat * 4;
  const total = Math.floor((prog.length * barMs * RATE) / 1000) + RATE; // +1s tail headroom
  const out = new Float32Array(total);
  let t = 0; // ms cursor
  for (const chord of prog) {
    const root = chord[0];
    // Bass: root note held for the bar (an octave down).
    renderNote(out, Math.floor((t / 1000) * RATE), midi(root - 12), barMs * 0.98, {
      type: "triangle",
      gain: bassGain,
    });
    // Lead: arpeggiate the chord across the bar.
    const step = barMs / (4 * arpDiv);
    for (let i = 0; i < 4 * arpDiv; i++) {
      const n = chord[i % chord.length] + (Math.floor(i / chord.length) % 2 === 1 ? 12 : 0);
      renderNote(out, Math.floor(((t + i * step) / 1000) * RATE), midi(n), step * 0.9, {
        type: leadType,
        gain: leadGain,
      });
    }
    t += barMs;
  }
  // Trim to exactly the progression length (drop the tail headroom) so it loops.
  return out.subarray(0, Math.floor((prog.length * barMs * RATE) / 1000));
}

// Overworld: bright, relaxed major progression (C - G - Am - F).
write(
  "music_overworld",
  buildMusic({
    bpm: 110,
    prog: [
      [60, 64, 67],
      [55, 59, 62],
      [57, 60, 64],
      [53, 57, 60],
    ],
  }),
);

// Battle: faster, tense minor (Am - F - C - G), brighter lead.
write(
  "music_battle",
  buildMusic({
    bpm: 150,
    prog: [
      [57, 60, 64],
      [53, 57, 60],
      [60, 64, 67],
      [55, 59, 62],
    ],
    leadGain: 0.24,
    arpDiv: 4,
  }),
);

// Venue: cool, jazzy 7th-chord feel (Dm7 - G7 - Cmaj7), slower, triangle lead.
write(
  "music_venue",
  buildMusic({
    bpm: 96,
    prog: [
      [62, 65, 69, 72],
      [55, 59, 65, 69],
      [60, 64, 67, 71],
    ],
    leadType: "triangle",
    leadGain: 0.26,
    bassGain: 0.28,
  }),
);

// --- Sound effects ------------------------------------------------------------
function buildSeq(notes) {
  // notes: [{freq, ms, type, gain, decay, gapMs}]
  const totalMs = notes.reduce((m, n) => m + n.ms + (n.gapMs ?? 0), 0);
  const out = new Float32Array(Math.ceil((totalMs / 1000) * RATE) + 8);
  let t = 0;
  for (const n of notes) {
    renderNote(out, Math.floor((t / 1000) * RATE), n.freq, n.ms, n);
    t += n.ms + (n.gapMs ?? 0);
  }
  return out;
}

// Glide (for the faint "wah down"): sweep frequency over the duration.
function buildGlide(f0, f1, ms, { type = "triangle", gain = 0.5 } = {}) {
  const len = Math.floor((ms / 1000) * RATE);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const k = i / len;
    const f = f0 * (f1 / f0) ** k;
    phase += f / RATE;
    let env = 1;
    const rel = Math.floor(len * 0.25);
    if (i > len - rel) env = (len - i) / rel;
    out[i] = osc(type, phase) * gain * env;
  }
  return out;
}

const N = (freq, ms, type, gain, extra = {}) => ({ freq, ms, type, gain, ...extra });

write("sfx_move", buildSeq([N(660, 35, "square", 0.32)]));
write("sfx_confirm", buildSeq([N(700, 45, "square", 0.34), N(1040, 70, "square", 0.34, { gapMs: 8 })]));
write("sfx_cancel", buildSeq([N(540, 45, "square", 0.32), N(360, 70, "square", 0.32, { gapMs: 8 })]));
// Hit: a noisy percussive thunk plus a low body.
write(
  "sfx_hit",
  (() => {
    const out = new Float32Array(Math.floor(0.12 * RATE));
    renderNote(out, 0, 180, 110, { type: "square", gain: 0.4, decay: true });
    renderNote(out, 0, 1, 90, { type: "noise", gain: 0.35, decay: true });
    return out;
  })(),
);
write("sfx_faint", buildGlide(520, 120, 460, { type: "triangle", gain: 0.4 }));
write(
  "sfx_levelup",
  buildSeq([
    N(midi(72), 70, "square", 0.34),
    N(midi(76), 70, "square", 0.34),
    N(midi(79), 70, "square", 0.34),
    N(midi(84), 150, "square", 0.36),
  ]),
);
write(
  "sfx_recruit",
  buildSeq([
    N(midi(67), 80, "triangle", 0.36),
    N(midi(72), 80, "triangle", 0.36),
    N(midi(76), 80, "triangle", 0.36),
    N(midi(79), 80, "triangle", 0.36),
    N(midi(84), 200, "triangle", 0.38),
  ]),
);

console.log(`\nWrote audio placeholders to ${OUT_DIR}`);
