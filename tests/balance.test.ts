import { describe, it, expect } from "vitest";
import { SPECIES } from "../src/data/species";
import { getTechnique } from "../src/data/techniques";
import { TRAINERS } from "../src/data/trainers";
import { createStarterParty } from "../src/systems/party";
import { createInstance } from "../src/systems/stats";
import { buildTrainerTeam } from "../src/systems/career";
import { getEffectivenessAgainst } from "../src/systems/genres";
import {
  createBattleState,
  resolveTurn,
  makeBattler,
  effectiveStat,
  STAB,
  type Battler,
  type BattleState,
} from "../src/systems/battle";
import { computeDamage } from "../src/systems/battle/damage";
import type { MusicianInstance } from "../src/types/musician";

const clone = (m: MusicianInstance): MusicianInstance => structuredClone(m);

/** Greedy: estimate a technique's damage (avg roll) for move selection. */
function estimateDamage(att: Battler, def: Battler, techId: string): number {
  const t = getTechnique(techId);
  if (!t || t.power <= 0) return 0;
  return computeDamage({
    level: att.instance.level,
    power: t.power,
    attack: effectiveStat(att, "skill"),
    defense: effectiveStat(def, "composure"),
    stab: att.genres.includes(t.genre) ? STAB : 1,
    effectiveness: getEffectivenessAgainst(t.genre, def.genres),
    randomFactor: 0.925,
  });
}

function bestMove(att: Battler, def: Battler): string {
  const moves = att.instance.techniques.filter((id) => getTechnique(id));
  let best = moves[0];
  let bestDmg = -1;
  for (const id of moves) {
    const d = estimateDamage(att, def, id);
    if (d > bestDmg) {
      bestDmg = d;
      best = id;
    }
  }
  return best;
}

const firstAliveExcept = (party: MusicianInstance[], active: number) =>
  party.findIndex((m, i) => i !== active && m.currentStamina > 0);

/** Play a (possibly multi-opponent) battle with greedy AI on both sides. */
function simulate(party: MusicianInstance[], team: MusicianInstance[], rng: () => number): "win" | "loss" {
  const p = party.map(clone);
  const opps = team.map(clone);
  const state: BattleState = createBattleState(p[0], opps[0]);
  let active = 0;
  let oppIdx = 0;

  for (let guard = 0; guard < 1000; guard++) {
    if (state.outcome === "player_won") {
      if (oppIdx + 1 < opps.length) {
        oppIdx++;
        state.opponent = makeBattler(opps[oppIdx]);
        state.outcome = "ongoing";
      } else return "win";
    } else if (state.outcome === "player_lost") {
      const next = firstAliveExcept(p, active);
      if (next < 0) return "loss";
      active = next;
      state.player = makeBattler(p[active]);
      state.outcome = "ongoing";
    }
    resolveTurn(
      state,
      { kind: "perform", techniqueId: bestMove(state.player, state.opponent) },
      { kind: "perform", techniqueId: bestMove(state.opponent, state.player) },
      rng,
    );
  }
  return "loss";
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Win rate of `party` vs a trainer's team over many seeds. */
function winRate(party: MusicianInstance[], trainerId: string, seeds = 40): number {
  const team = buildTrainerTeam(TRAINERS[trainerId]);
  let wins = 0;
  for (let i = 0; i < seeds; i++) if (simulate(party, team, makeRng(i * 2654435761)) === "win") wins++;
  return wins / seeds;
}

describe("balance: early game is beatable", () => {
  it("the starter party can beat the early rival", () => {
    const rate = winRate(createStarterParty(), "rival_max");
    console.log(`starter vs rival win rate: ${(rate * 100).toFixed(0)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.75);
  });

  it("a normally-played party (leveled + a busking recruit) can beat the first venue", () => {
    // Normal play: the 2 starters leveled up plus a Balladeer recruited from the
    // busking zone (folk -> strong into the jazz venue).
    const party = [
      createInstance(SPECIES.rifflet, 9),
      createInstance(SPECIES.crooner, 9),
      createInstance(SPECIES.balladeer, 9),
    ];
    const rate = winRate(party, "jazz_headliner");
    console.log(`recruited party (L9) vs venue boss win rate: ${(rate * 100).toFixed(0)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.75);

    // The two leveled starters alone (no counter) — for reference.
    const starters = [createInstance(SPECIES.rifflet, 9), createInstance(SPECIES.crooner, 9)];
    console.log(`leveled starters only (L9) vs venue boss: ${(winRate(starters, "jazz_headliner") * 100).toFixed(0)}%`);
  });

  it("the first venue still requires leveling (not trivial for the bare starter)", () => {
    const rate = winRate(createStarterParty(), "jazz_headliner");
    console.log(`bare starter vs venue boss win rate: ${(rate * 100).toFixed(0)}%`);
    expect(rate).toBeLessThan(0.6); // beatable later, not at level 5
  });
});

describe("balance: the second venue (the warehouse) is a step up", () => {
  // The warehouse is electronic-themed (boss L13-15), a clear tier above the
  // jazz club (boss L8-9), and it sits behind a guard rival. The intended
  // answer is to recruit a CLASSICAL player (Sonatina, 2x into electronic) from
  // the new park encounter zone — leveling a folk/jazz party is not enough.

  it("needs a counter, not just levels: an uncountered party loses even when leveled", () => {
    // The jazz-era party at jazz-venue levels.
    const jazzEra = [
      createInstance(SPECIES.rifflet, 9),
      createInstance(SPECIES.crooner, 9),
      createInstance(SPECIES.balladeer, 9),
    ];
    // Same party leveled up — but folk is *weak* into electronic, so levels alone
    // don't crack it.
    const leveled = [
      createInstance(SPECIES.rifflet, 14),
      createInstance(SPECIES.crooner, 14),
      createInstance(SPECIES.balladeer, 14),
    ];
    const jazzRate = winRate(jazzEra, "warehouse_headliner");
    const leveledRate = winRate(leveled, "warehouse_headliner");
    console.log(`jazz-era party vs warehouse boss: ${(jazzRate * 100).toFixed(0)}%`);
    console.log(`leveled (no counter) vs warehouse boss: ${(leveledRate * 100).toFixed(0)}%`);
    expect(jazzRate).toBeLessThan(0.4);
    expect(leveledRate).toBeLessThan(0.5);
  });

  it("is winnable with a classical counter (Sonatina) recruited from the park", () => {
    const ready = [
      createInstance(SPECIES.rifflet, 13),
      createInstance(SPECIES.crooner, 13),
      createInstance(SPECIES.sonatina, 13),
    ];
    const rate = winRate(ready, "warehouse_headliner");
    console.log(`classical-counter party (L13) vs warehouse boss: ${(rate * 100).toFixed(0)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.75);

    // Funk (Funkadel) is a softer counter — winnable, but the boss's Orchestron
    // resists it, so it's not the clean answer classical is. (Reference only.)
    const funk = [
      createInstance(SPECIES.rifflet, 13),
      createInstance(SPECIES.crooner, 13),
      createInstance(SPECIES.funkadel, 13),
    ];
    console.log(`funk-counter party (L13) vs warehouse boss: ${(winRate(funk, "warehouse_headliner") * 100).toFixed(0)}%`);
  });

  it("the venue guard (Rival Dex) gates it: tough early, fair once you're ready", () => {
    const jazzEra = [
      createInstance(SPECIES.rifflet, 9),
      createInstance(SPECIES.crooner, 9),
      createInstance(SPECIES.balladeer, 9),
    ];
    const ready = [
      createInstance(SPECIES.rifflet, 13),
      createInstance(SPECIES.crooner, 13),
      createInstance(SPECIES.sonatina, 13),
    ];
    const earlyRate = winRate(jazzEra, "rival_dex");
    const readyRate = winRate(ready, "rival_dex");
    console.log(`jazz-era vs guard: ${(earlyRate * 100).toFixed(0)}%  ready vs guard: ${(readyRate * 100).toFixed(0)}%`);
    expect(earlyRate).toBeLessThan(0.5);
    expect(readyRate).toBeGreaterThanOrEqual(0.75);
  });
});

describe("balance: district venues (the circuit)", () => {
  // The Amp (rock). Every party already carries the jazz starter Crooner, which
  // hard-counters rock — so this venue is a LEVEL check, not a counter check.
  it("Rock / The Amp: under-leveled struggles, a leveled party clears it", () => {
    const under = [
      createInstance(SPECIES.rifflet, 9),
      createInstance(SPECIES.crooner, 9),
      createInstance(SPECIES.balladeer, 9),
    ];
    const ready = [
      createInstance(SPECIES.rifflet, 13),
      createInstance(SPECIES.crooner, 13),
      createInstance(SPECIES.balladeer, 13),
    ];
    console.log(`rock: under ${(winRate(under, "rock_headliner") * 100).toFixed(0)}%  ready ${(winRate(ready, "rock_headliner") * 100).toFixed(0)}%`);
    expect(winRate(under, "rock_headliner")).toBeLessThan(0.6);
    expect(winRate(ready, "rock_headliner")).toBeGreaterThanOrEqual(0.75);
  });

  // The Landing (folk). Folk is weak to electronic AND funk, so a leveled party
  // with NEITHER counter loses; recruiting a funk/electronic player cracks it.
  it("Folk / The Landing: needs an electronic/funk counter, not just levels", () => {
    const noCounter = [
      createInstance(SPECIES.rifflet, 15),
      createInstance(SPECIES.crooner, 15),
      createInstance(SPECIES.amplifret, 15),
    ];
    const countered = [
      createInstance(SPECIES.rifflet, 15),
      createInstance(SPECIES.crooner, 15),
      createInstance(SPECIES.grooveling, 16), // funk -> 2x into folk
    ];
    console.log(`folk: no-counter ${(winRate(noCounter, "folk_headliner") * 100).toFixed(0)}%  countered ${(winRate(countered, "folk_headliner") * 100).toFixed(0)}%`);
    expect(winRate(noCounter, "folk_headliner")).toBeLessThan(0.5);
    expect(winRate(countered, "folk_headliner")).toBeGreaterThanOrEqual(0.7);
  });

  // The Pocket (funk). A higher-tier venue (opens after the warehouse). The
  // Fusionaut ace resists the usual rock counter, so it's a steeper level check.
  it("Funk / The Pocket: a deeper level check (later-tier venue)", () => {
    const under = [
      createInstance(SPECIES.rifflet, 13),
      createInstance(SPECIES.crooner, 13),
      createInstance(SPECIES.balladeer, 13),
    ];
    const ready = [
      createInstance(SPECIES.rifflet, 18),
      createInstance(SPECIES.crooner, 18),
      createInstance(SPECIES.sonatina, 18), // classical -> 2x into funk
    ];
    console.log(`funk: under ${(winRate(under, "funk_headliner") * 100).toFixed(0)}%  ready ${(winRate(ready, "funk_headliner") * 100).toFixed(0)}%`);
    expect(winRate(under, "funk_headliner")).toBeLessThan(0.6);
    expect(winRate(ready, "funk_headliner")).toBeGreaterThanOrEqual(0.7);
  });

  // The Conservatory (classical). The top district venue before the Tower.
  it("Classical / The Conservatory: the toughest district venue", () => {
    const under = [
      createInstance(SPECIES.rifflet, 15),
      createInstance(SPECIES.crooner, 15),
      createInstance(SPECIES.balladeer, 15),
    ];
    const ready = [
      createInstance(SPECIES.rifflet, 20),
      createInstance(SPECIES.crooner, 20),
      createInstance(SPECIES.balladeer, 20),
    ];
    console.log(`classical: under ${(winRate(under, "classical_headliner") * 100).toFixed(0)}%  ready ${(winRate(ready, "classical_headliner") * 100).toFixed(0)}%`);
    expect(winRate(under, "classical_headliner")).toBeLessThan(0.6);
    expect(winRate(ready, "classical_headliner")).toBeGreaterThanOrEqual(0.7);
  });
});
