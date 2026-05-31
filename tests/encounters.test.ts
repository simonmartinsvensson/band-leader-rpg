import { describe, it, expect } from "vitest";
import { rollEncounter } from "../src/systems/encounters";
import type { EncounterZone } from "../src/data/encounters";

const zone: EncounterZone = { rate: 0.25, musicians: ["a", "b", "c", "d"] };

/** A scripted random source returning the given values in order. */
const rng = (...values: number[]) => {
  let i = 0;
  return () => values[i++] ?? 0;
};

describe("rollEncounter", () => {
  it("does not trigger when the first roll is >= rate", () => {
    expect(rollEncounter(zone, () => 0.25)).toBeNull();
    expect(rollEncounter(zone, () => 0.9)).toBeNull();
  });

  it("triggers when the first roll is < rate and picks from the pool", () => {
    expect(rollEncounter(zone, rng(0.1, 0.0))).toBe("a"); // floor(0.0 * 4) = 0
    expect(rollEncounter(zone, rng(0.1, 0.5))).toBe("c"); // floor(0.5 * 4) = 2
    expect(rollEncounter(zone, rng(0.1, 0.99))).toBe("d"); // floor(0.99 * 4) = 3
  });

  it("rate 0 never triggers; rate 1 always triggers", () => {
    expect(rollEncounter({ rate: 0, musicians: ["x"] }, () => 0)).toBeNull();
    expect(rollEncounter({ rate: 1, musicians: ["x"] }, () => 0.99)).toBe("x");
  });

  it("returns null for an empty pool even if the rate roll passes", () => {
    expect(rollEncounter({ rate: 1, musicians: [] }, () => 0)).toBeNull();
  });
});
