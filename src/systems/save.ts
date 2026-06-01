import type { MusicianInstance } from "../types/musician";

// Save/load to localStorage. The serialize/deserialize/snapshot logic is pure
// (no DOM) so it's unit-testable; only the thin wrappers touch localStorage.

export const SAVE_VERSION = 1;
const STORAGE_KEY = "band-leader-rpg/save";

/** Fallback band-leader name if the player somehow hasn't chosen one. */
export const DEFAULT_PLAYER_NAME = "Newcomer";

/** Everything needed to resume a session. All fields are JSON-serializable. */
export interface SaveData {
  version: number;
  /** The player's chosen band-leader name (surfaced in dialogue). */
  playerName: string;
  /** Current overworld location. */
  map: string;
  x: number;
  y: number;
  /** Party + roster carry per-musician state incl. learned techniques. */
  party: MusicianInstance[];
  roster: MusicianInstance[];
  bag: Record<string, number>;
  currency: number;
  flags: Record<string, boolean>;
  trainersDefeated: Record<string, boolean>;
  residencies: string[];
}

/** A registry-like key/value store (Phaser's game registry satisfies this). */
export interface SaveStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

/** Build a SaveData snapshot from the live game store. */
export function snapshot(store: SaveStore): SaveData {
  const loc = asObj(store.get("loc"));
  return {
    version: SAVE_VERSION,
    playerName: typeof store.get("playerName") === "string" ? (store.get("playerName") as string) : DEFAULT_PLAYER_NAME,
    map: typeof loc.map === "string" ? loc.map : "town",
    x: typeof loc.x === "number" ? loc.x : 0,
    y: typeof loc.y === "number" ? loc.y : 0,
    party: (store.get("party") as MusicianInstance[]) ?? [],
    roster: (store.get("roster") as MusicianInstance[]) ?? [],
    bag: (store.get("bag") as Record<string, number>) ?? {},
    currency: (store.get("currency") as number) ?? 0,
    flags: (store.get("flags") as Record<string, boolean>) ?? {},
    trainersDefeated: (store.get("trainersDefeated") as Record<string, boolean>) ?? {},
    residencies: (store.get("residencies") as string[]) ?? [],
  };
}

/** Restore a SaveData into the live game store. */
export function applyToStore(store: SaveStore, save: SaveData): void {
  store.set("playerName", save.playerName ?? DEFAULT_PLAYER_NAME);
  store.set("party", save.party);
  store.set("roster", save.roster);
  store.set("bag", save.bag);
  store.set("currency", save.currency);
  store.set("flags", save.flags);
  store.set("trainersDefeated", save.trainersDefeated);
  store.set("residencies", save.residencies);
  store.set("loc", { map: save.map, x: save.x, y: save.y });
}

export function serialize(save: SaveData): string {
  return JSON.stringify(save);
}

/** Parse + validate (+ migrate) raw JSON. Returns null for missing/corrupt data. */
export function deserialize(raw: string | null): SaveData | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isValidSave(parsed)) return null;
  return migrate(parsed);
}

function isValidSave(p: unknown): p is SaveData {
  if (!p || typeof p !== "object") return false;
  const s = p as Record<string, unknown>;
  return (
    typeof s.version === "number" &&
    typeof s.map === "string" &&
    typeof s.x === "number" &&
    typeof s.y === "number" &&
    Array.isArray(s.party) &&
    Array.isArray(s.roster) &&
    Array.isArray(s.residencies) &&
    typeof s.currency === "number" &&
    typeof s.bag === "object" &&
    s.bag !== null
  );
}

/** Bring an older save up to the current version, or reject what we can't read. */
function migrate(save: SaveData): SaveData | null {
  if (save.version === SAVE_VERSION) return save;
  // No older versions exist yet; an unknown/newer version is not loadable.
  return null;
}

// --- localStorage wrappers (browser only; all guarded) -----------------------

export function saveGame(store: SaveStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(snapshot(store)));
    return true;
  } catch {
    return false;
  }
}

export function loadSave(): SaveData | null {
  try {
    return deserialize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
