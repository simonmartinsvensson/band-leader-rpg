import { describe, it, expect } from "vitest";
import { awardXp, xpReward, MAX_LEVEL } from "../src/systems/progression";
import {
  createStarterParty,
  healParty,
  isPartyDefeated,
  firstAliveIndex,
  swapMembers,
} from "../src/systems/party";
import { createInstance, computeStats, xpForLevel } from "../src/systems/stats";
import { SPECIES } from "../src/data/species";

describe("xpReward", () => {
  it("scales with the opponent's level", () => {
    expect(xpReward(createInstance(SPECIES.grooveling, 3))).toBe(39);
    expect(xpReward(createInstance(SPECIES.grooveling, 6))).toBe(78);
  });
});

describe("awardXp", () => {
  it("levels up, recomputes stats, and learns the learnset technique", () => {
    const m = createInstance(SPECIES.rifflet, 4); // knows power_chord; learns stage_dive at 5
    expect(m.techniques).toEqual(["power_chord"]);

    const ups = awardXp(m, xpReward(createInstance(SPECIES.grooveling, 3))); // 39 XP, 27 -> 66

    expect(m.level).toBe(5);
    expect(m.techniques).toContain("stage_dive");
    expect(m.stats.skill).toBe(computeStats(SPECIES.rifflet, 5).skill);
    expect(ups.some((u) => u.level === 5 && u.learned.includes("stage_dive"))).toBe(true);
  });

  it("carries the max-stamina gain into current stamina", () => {
    const m = createInstance(SPECIES.rifflet, 4);
    m.currentStamina = 5; // damaged
    const before = m.stats.stamina;
    awardXp(m, 1000);
    const gain = m.stats.stamina - before;
    expect(gain).toBeGreaterThan(0);
    expect(m.currentStamina).toBe(5 + gain);
  });

  it("handles multi-level jumps and never exceeds MAX_LEVEL", () => {
    const m = createInstance(SPECIES.rifflet, 4);
    const ups = awardXp(m, 10_000_000);
    expect(m.level).toBe(MAX_LEVEL);
    expect(ups.length).toBeGreaterThan(1);
    expect(m.xp).toBeGreaterThanOrEqual(xpForLevel(MAX_LEVEL));
  });

  it("does nothing when XP is below the next threshold", () => {
    const m = createInstance(SPECIES.crooner, 8);
    awardXp(m, 1);
    expect(m.level).toBe(8);
  });
});

describe("party helpers", () => {
  it("creates a starter party", () => {
    const party = createStarterParty();
    expect(party.length).toBe(2);
    expect(party[0].speciesId).toBe("rifflet");
  });

  it("detects defeat and finds the first alive member", () => {
    const party = createStarterParty();
    expect(isPartyDefeated(party)).toBe(false);
    expect(firstAliveIndex(party)).toBe(0);

    party[0].currentStamina = 0;
    expect(firstAliveIndex(party)).toBe(1);
    party[1].currentStamina = 0;
    expect(isPartyDefeated(party)).toBe(true);
    expect(firstAliveIndex(party)).toBe(-1);
  });

  it("heals the whole party and reorders members", () => {
    const party = createStarterParty();
    party.forEach((m) => (m.currentStamina = 1));
    healParty(party);
    expect(party.every((m) => m.currentStamina === m.stats.stamina)).toBe(true);

    const [a, b] = party;
    swapMembers(party, 0, 1);
    expect(party[0]).toBe(b);
    expect(party[1]).toBe(a);
  });
});
