import { describe, it, expect } from "vitest";
import { auditionAttempt, catchRateFromDifficulty } from "../src/systems/recruit";
import { recruit } from "../src/systems/roster";
import { createInstance } from "../src/systems/stats";
import { SPECIES } from "../src/data/species";
import { MAX_PARTY } from "../src/systems/party";

describe("catchRateFromDifficulty", () => {
  it("maps difficulty to a 3..255 rate (harder = lower)", () => {
    expect(catchRateFromDifficulty(0)).toBe(230);
    expect(catchRateFromDifficulty(0.5)).toBe(130);
    expect(catchRateFromDifficulty(1)).toBe(30);
  });
});

describe("auditionAttempt", () => {
  it("is a guaranteed success when the odds saturate (low difficulty, low HP, item)", () => {
    const r = auditionAttempt({ maxStamina: 30, curStamina: 0, difficulty: 0, itemModifier: 2 });
    expect(r.success).toBe(true);
    expect(r.chance).toBe(1);
  });

  it("succeeds with a low roll and fails with a high roll (4 shake checks)", () => {
    const input = { maxStamina: 30, curStamina: 30, difficulty: 0.5 }; // sub-255 odds
    expect(auditionAttempt(input, () => 0).success).toBe(true); // all shakes pass
    const miss = auditionAttempt(input, () => 0.999);
    expect(miss.success).toBe(false);
    expect(miss.shakes).toBeLessThan(4);
  });

  it("is easier at low HP and with a demo tape", () => {
    const full = auditionAttempt({ maxStamina: 40, curStamina: 40, difficulty: 0.4 }).chance;
    const weak = auditionAttempt({ maxStamina: 40, curStamina: 1, difficulty: 0.4 }).chance;
    const tape = auditionAttempt({ maxStamina: 40, curStamina: 40, difficulty: 0.4, itemModifier: 2 }).chance;
    expect(weak).toBeGreaterThan(full);
    expect(tape).toBeGreaterThan(full);
  });
});

describe("recruit (roster overflow)", () => {
  it("adds to the party when there's room", () => {
    const party = [createInstance(SPECIES.rifflet, 5)];
    const roster: ReturnType<typeof createInstance>[] = [];
    const dest = recruit(party, roster, createInstance(SPECIES.crooner, 5));
    expect(dest).toBe("party");
    expect(party.length).toBe(2);
    expect(roster.length).toBe(0);
  });

  it("overflows to the roster when the party is full", () => {
    const party = Array.from({ length: MAX_PARTY }, () => createInstance(SPECIES.rifflet, 5));
    const roster: ReturnType<typeof createInstance>[] = [];
    const dest = recruit(party, roster, createInstance(SPECIES.crooner, 5));
    expect(dest).toBe("roster");
    expect(party.length).toBe(MAX_PARTY);
    expect(roster.length).toBe(1);
  });
});
