import { describe, it, expect } from "vitest";
import {
  computeDamage,
  stageMultiplier,
  createBattleState,
  resolveTurn,
  chooseOpponentAction,
  effectiveStat,
} from "../src/systems/battle";
import { createInstance } from "../src/systems/stats";
import { SPECIES } from "../src/data/species";
import type { BattleEvent } from "../src/systems/battle";

describe("computeDamage", () => {
  const base = { level: 50, power: 60, attack: 100, defense: 100, stab: 1, effectiveness: 1, randomFactor: 1 };

  it("follows the FireRed-style formula", () => {
    expect(computeDamage(base)).toBe(28);
  });

  it("applies STAB, effectiveness, and the random spread", () => {
    expect(computeDamage({ ...base, stab: 1.5 })).toBe(42);
    expect(computeDamage({ ...base, effectiveness: 2 })).toBe(56);
    expect(computeDamage({ ...base, effectiveness: 0.5 })).toBe(14);
    expect(computeDamage({ ...base, randomFactor: 0.85 })).toBe(23);
  });

  it("is 0 for status techniques or immunity, and clamps a landed hit to >= 1", () => {
    expect(computeDamage({ ...base, power: 0 })).toBe(0);
    expect(computeDamage({ ...base, effectiveness: 0 })).toBe(0);
    // A hit that would round to 0 is clamped up to 1.
    expect(computeDamage({ ...base, power: 1, attack: 1, defense: 999, effectiveness: 0.25 })).toBe(1);
  });
});

describe("stageMultiplier", () => {
  it("maps stages to FireRed multipliers", () => {
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(1)).toBe(1.5);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(6)).toBe(4);
    expect(stageMultiplier(-1)).toBeCloseTo(2 / 3);
    expect(stageMultiplier(-6)).toBe(0.25);
  });

  it("is reflected by effectiveStat", () => {
    const b = createBattleState(createInstance(SPECIES.rifflet, 20), createInstance(SPECIES.crooner, 20)).player;
    const baseSkill = b.instance.stats.skill;
    b.stages.skill = 2; // x2
    expect(effectiveStat(b, "skill")).toBe(baseSkill * 2);
  });
});

const always = (v: number) => () => v;

describe("resolveTurn", () => {
  it("damages the defender and reports effectiveness both ways", () => {
    // Rock (rifflet) hits Funk super-effectively; Funk hits Rock weakly.
    const state = createBattleState(createInstance(SPECIES.rifflet, 30), createInstance(SPECIES.grooveling, 30));
    const before = state.opponent.instance.currentStamina;
    const events = resolveTurn(
      state,
      { kind: "perform", techniqueId: "power_chord" },
      { kind: "perform", techniqueId: "groove_lock" },
      always(0),
    );
    expect(state.opponent.instance.currentStamina).toBeLessThan(before);
    const multipliers = events
      .filter((e): e is Extract<BattleEvent, { type: "effectiveness" }> => e.type === "effectiveness")
      .map((e) => e.multiplier);
    expect(multipliers).toContain(2); // power_chord (rock) vs funk = showstopper
    expect(multipliers).toContain(0.5); // groove_lock (funk) vs rock = falls flat
  });

  it("misses when the accuracy roll fails (no damage)", () => {
    const state = createBattleState(createInstance(SPECIES.rifflet, 30), createInstance(SPECIES.grooveling, 30));
    const before = state.opponent.instance.currentStamina;
    // stage_dive accuracy 0.8; a roll of 0.99 >= 0.8 => miss.
    const events = resolveTurn(
      state,
      { kind: "perform", techniqueId: "stage_dive" },
      { kind: "perform", techniqueId: "groove_lock" },
      always(0.99),
    );
    expect(events.some((e) => e.type === "miss")).toBe(true);
    // opponent (faster? no) — at least the player's stage_dive dealt no damage to opponent on its miss.
    // Both may miss with 0.99, so opponent stamina unchanged.
    expect(state.opponent.instance.currentStamina).toBe(before);
  });

  it("higher priority acts first regardless of speed", () => {
    // synthling's sync_pulse has priority 1; give the opponent the slow mover.
    const state = createBattleState(createInstance(SPECIES.synthling, 30), createInstance(SPECIES.maestrel, 30));
    const events = resolveTurn(
      state,
      { kind: "perform", techniqueId: "sync_pulse" }, // priority 1
      { kind: "perform", techniqueId: "sonata" }, // priority 0
      always(0),
    );
    const firstAction = events.find((e) => e.type === "action");
    expect(firstAction).toMatchObject({ side: "player" });
  });

  it("run ends the battle as fled", () => {
    const state = createBattleState(createInstance(SPECIES.rifflet, 30), createInstance(SPECIES.grooveling, 30));
    const events = resolveTurn(state, { kind: "run" }, { kind: "perform", techniqueId: "groove_lock" }, always(0));
    expect(state.outcome).toBe("fled");
    expect(events.some((e) => e.type === "run")).toBe(true);
  });

  it("fights a full loop to a faint and the player wins", () => {
    const state = createBattleState(createInstance(SPECIES.rifflet, 20), createInstance(SPECIES.grooveling, 16));
    const rng = always(0); // deterministic: always hit, min damage, player first
    let guard = 0;
    let lastEvents: BattleEvent[] = [];
    while (state.outcome === "ongoing" && guard < 200) {
      lastEvents = resolveTurn(
        state,
        { kind: "perform", techniqueId: "power_chord" },
        chooseOpponentAction(state.opponent, rng),
        rng,
      );
      guard++;
    }
    expect(state.outcome).toBe("player_won");
    expect(state.opponent.instance.currentStamina).toBe(0);
    expect(lastEvents.some((e) => e.type === "faint" && e.side === "opponent")).toBe(true);
  });
});
