import { describe, it, expect } from "vitest";
import { GENRES, GENRE_LIST } from "../src/data/genres";
import { TECHNIQUES, TECHNIQUE_LIST } from "../src/data/techniques";
import { SPECIES, SPECIES_LIST } from "../src/data/species";
import {
  getEffectiveness,
  SUPER_EFFECTIVE,
  NOT_VERY_EFFECTIVE,
  NEUTRAL,
} from "../src/systems/genres";
import {
  computeStats,
  createInstance,
  knownTechniquesAt,
  xpForLevel,
  xpToNextLevel,
  MAX_TECHNIQUES,
} from "../src/systems/stats";
import { BALANCE } from "../src/data/balance";
import type { MusicianSpecies } from "../src/types/musician";

describe("genre effectiveness lookup", () => {
  it("returns clean attacker-vs-defender multipliers", () => {
    expect(getEffectiveness("jazz", "rock")).toBe(SUPER_EFFECTIVE); // strong
    expect(getEffectiveness("rock", "jazz")).toBe(NOT_VERY_EFFECTIVE); // weak
    expect(getEffectiveness("jazz", "funk")).toBe(NEUTRAL); // opposite on the wheel
    expect(getEffectiveness("jazz", "jazz")).toBe(NEUTRAL); // mirror
  });

  it("has an internally consistent chart (A strong vs B => B weak vs A)", () => {
    for (const a of GENRE_LIST) {
      for (const d of GENRES[a].strongAgainst) {
        expect(GENRES[d].weakAgainst).toContain(a);
      }
    }
  });
});

describe("data integrity", () => {
  it("delivers the requested content volume", () => {
    expect(TECHNIQUE_LIST.length).toBeGreaterThanOrEqual(8);
    expect(SPECIES_LIST.length).toBeGreaterThanOrEqual(6);
  });

  it("every technique has a valid genre", () => {
    for (const t of TECHNIQUE_LIST) expect(GENRE_LIST).toContain(t.genre);
  });

  it("every species references valid genres and existing learnset techniques", () => {
    for (const s of SPECIES_LIST) {
      expect(s.genres.length).toBeGreaterThan(0);
      for (const g of s.genres) expect(GENRE_LIST).toContain(g);
      for (const ids of Object.values(s.learnset)) {
        for (const id of ids) expect(TECHNIQUES[id]).toBeDefined();
      }
    }
  });
});

describe("stat formula", () => {
  it("grows stats with level", () => {
    const lo = computeStats(SPECIES.rifflet, 5);
    const hi = computeStats(SPECIES.rifflet, 50);
    expect(hi.stamina).toBeGreaterThan(lo.stamina);
    expect(hi.skill).toBeGreaterThan(lo.skill);
    expect(hi.tempo).toBeGreaterThan(lo.tempo);
  });

  it("matches the documented formula", () => {
    const lvl = 50;
    const s = SPECIES.rifflet; // skill 60, stamina 45
    expect(computeStats(s, lvl).skill).toBe(Math.floor((2 * 60 * lvl) / 100) + 5);
    // Stamina pool is scaled by the central balance knob.
    const baseStamina = Math.floor((2 * 45 * lvl) / 100) + lvl + 10;
    expect(computeStats(s, lvl).stamina).toBe(Math.floor(baseStamina * BALANCE.staminaMultiplier));
  });
});

describe("xp curve", () => {
  it("is 0 at level 1 and strictly increasing", () => {
    expect(xpForLevel(1)).toBe(0);
    for (let l = 1; l < 25; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    }
  });

  it("xpToNextLevel is the delta between thresholds", () => {
    expect(xpToNextLevel(5)).toBe(xpForLevel(6) - xpForLevel(5));
  });
});

describe("createInstance", () => {
  it("builds a recruit with computed stats and full stamina", () => {
    const inst = createInstance(SPECIES.synthling, 10, "Bleep");
    expect(inst.speciesId).toBe("synthling");
    expect(inst.nickname).toBe("Bleep");
    expect(inst.level).toBe(10);
    expect(inst.xp).toBe(xpForLevel(10));
    expect(inst.currentStamina).toBe(inst.stats.stamina);
    expect(inst.techniques.length).toBeGreaterThan(0);
    expect(inst.techniques.length).toBeLessThanOrEqual(MAX_TECHNIQUES);
  });

  it("defaults the nickname to the species name", () => {
    expect(createInstance(SPECIES.rifflet, 5).nickname).toBe("Rifflet");
  });

  it("knows techniques learned up to its level", () => {
    expect(knownTechniquesAt(SPECIES.orchestron, 1)).toEqual(["sonata"]);
    expect(knownTechniquesAt(SPECIES.orchestron, 6)).toEqual(["sonata", "sync_pulse"]);
    expect(knownTechniquesAt(SPECIES.orchestron, 99)).toEqual(["sonata", "sync_pulse", "drop"]);
  });

  it("caps known techniques at MAX_TECHNIQUES (keeps the most recent)", () => {
    const overlearner: MusicianSpecies = {
      id: "test",
      name: "Test",
      genres: ["jazz"],
      baseStats: { stamina: 1, skill: 1, composure: 1, tempo: 1 },
      learnset: { 1: ["a"], 2: ["b"], 3: ["c"], 4: ["d"], 5: ["e"] },
      recruitDifficulty: 0,
    };
    expect(knownTechniquesAt(overlearner, 99)).toEqual(["b", "c", "d", "e"]);
  });
});

describe("sanity summary (console)", () => {
  it("prints a quick stats + effectiveness readout", () => {
    const inst = createInstance(SPECIES.rifflet, 25);
    console.log(`Rifflet @25 -> stats=${JSON.stringify(inst.stats)} techniques=${inst.techniques.join(",")}`);
    console.log(
      `effectiveness: jazz>rock=${getEffectiveness("jazz", "rock")} ` +
        `rock>jazz=${getEffectiveness("rock", "jazz")} ` +
        `jazz>funk=${getEffectiveness("jazz", "funk")}`,
    );
    expect(inst.stats.stamina).toBeGreaterThan(0);
  });
});
