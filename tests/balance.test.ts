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
