import { describe, it, expect } from "vitest";
import {
  SAVE_VERSION,
  snapshot,
  applyToStore,
  serialize,
  deserialize,
  type SaveStore,
} from "../src/systems/save";
import { createStarterParty } from "../src/systems/party";
import { createInstance } from "../src/systems/stats";
import { SPECIES } from "../src/data/species";

/** A Map-backed store standing in for the Phaser registry. */
function makeStore(initial: Record<string, unknown> = {}): SaveStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>(Object.entries(initial));
  return { data, get: (k) => data.get(k), set: (k, v) => void data.set(k, v) };
}

function fullStore() {
  return makeStore({
    loc: { map: "jazz_club", x: 8, y: 8 },
    party: createStarterParty(),
    roster: [createInstance(SPECIES.balladeer, 9)],
    bag: { snack: 2, demo_tape: 1 },
    currency: 1400,
    flags: { roadie_gift: true },
    trainersDefeated: { rival_max: true, jazz_headliner: true },
    residencies: ["jazz"],
  });
}

describe("snapshot + applyToStore", () => {
  it("captures all game state from the store", () => {
    const save = snapshot(fullStore());
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.map).toBe("jazz_club");
    expect(save).toMatchObject({ x: 8, y: 8, currency: 1400, residencies: ["jazz"] });
    expect(save.party.length).toBe(2);
    expect(save.roster[0].speciesId).toBe("balladeer");
    expect(save.trainersDefeated.rival_max).toBe(true);
  });

  it("round-trips through serialize/deserialize into a fresh store", () => {
    const before = snapshot(fullStore());
    const restored = deserialize(serialize(before))!;
    const fresh = makeStore();
    applyToStore(fresh, restored);

    expect(snapshot(fresh)).toEqual(before); // same state after a save/load cycle
  });

  it("defaults a missing location sensibly", () => {
    const save = snapshot(makeStore({ party: [], roster: [], bag: {}, currency: 0, residencies: [] }));
    expect(save.map).toBe("town");
  });
});

describe("deserialize guards", () => {
  it("returns null for missing/empty input", () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize("")).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    expect(deserialize("{not json")).toBeNull();
    expect(deserialize("42")).toBeNull();
  });

  it("returns null for the wrong shape", () => {
    expect(deserialize(JSON.stringify({ version: 1 }))).toBeNull(); // missing fields
    expect(deserialize(JSON.stringify({ ...snapshot(fullStore()), party: "nope" }))).toBeNull();
  });

  it("rejects an unknown (newer) version", () => {
    const future = { ...snapshot(fullStore()), version: 999 };
    expect(deserialize(JSON.stringify(future))).toBeNull();
  });
});
