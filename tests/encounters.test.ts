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

describe("rollEncounter rarity tiers", () => {
  const rareZone: EncounterZone = {
    rate: 1,
    minLevel: 1,
    maxLevel: 1,
    musicians: ["c1", "c2"],
    rare: ["r1", "r2"],
    rareChance: 0.2,
  };

  it("draws from the rare pool when the rare roll lands under rareChance", () => {
    // draws: rate(0 < 1) -> rare-roll(0.1 < 0.2 = rare) -> pick(0.0 -> r1)
    expect(rollEncounter(rareZone, rng(0, 0.1, 0.0))).toBe("r1");
    expect(rollEncounter(rareZone, rng(0, 0.1, 0.99))).toBe("r2");
  });

  it("draws from the common pool when the rare roll misses", () => {
    // draws: rate -> rare-roll(0.5 >= 0.2 = common) -> pick(0.99 -> c2)
    expect(rollEncounter(rareZone, rng(0, 0.5, 0.99))).toBe("c2");
  });

  it("skips the rare roll entirely when a zone has no rare pool (common path unchanged)", () => {
    // Only two draws are consumed: the rate roll and the pick.
    expect(rollEncounter({ rate: 1, minLevel: 1, maxLevel: 1, musicians: ["x", "y"] }, rng(0, 0.99))).toBe("y");
  });
});
