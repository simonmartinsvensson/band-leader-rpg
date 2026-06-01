import type { MusicianInstance } from "../../types/musician";
import type { StatKey } from "../../types/stats";
import { getSpecies } from "../../data/species";
import { getTechnique } from "../../data/techniques";
import { getEffectivenessAgainst } from "../genres";
import { computeDamage, stageMultiplier, STAB } from "./damage";
import { BALANCE } from "../../data/balance";
import type { Battler, BattleAction, BattleEvent, BattleState, Side } from "./types";

type Rng = () => number;

const other = (side: Side): Side => (side === "player" ? "opponent" : "player");
const clampStage = (n: number) => Math.max(-6, Math.min(6, n));

/** Wrap a musician instance as a battler (genres from its species). */
export function makeBattler(instance: MusicianInstance): Battler {
  const species = getSpecies(instance.speciesId);
  return {
    instance,
    genres: species ? species.genres : [],
    stages: { stamina: 0, skill: 0, composure: 0, tempo: 0 },
  };
}

export function createBattleState(player: MusicianInstance, opponent: MusicianInstance): BattleState {
  return { player: makeBattler(player), opponent: makeBattler(opponent), outcome: "ongoing" };
}

/** A battler's stat after applying its current stage multiplier. */
export function effectiveStat(battler: Battler, key: StatKey): number {
  return Math.max(1, Math.floor(battler.instance.stats[key] * stageMultiplier(battler.stages[key])));
}

export function isFainted(battler: Battler): boolean {
  return battler.instance.currentStamina <= 0;
}

/** Simple AI: pick a random known (and valid) technique. */
export function chooseOpponentAction(opponent: Battler, rng: Rng = Math.random): BattleAction {
  const known = opponent.instance.techniques.filter((id) => getTechnique(id));
  if (known.length === 0) return { kind: "run" };
  return { kind: "perform", techniqueId: known[Math.floor(rng() * known.length)] };
}

function priorityOf(action: BattleAction): number {
  if (action.kind !== "perform") return 0;
  return getTechnique(action.techniqueId)?.priority ?? 0;
}

/** Resolve who acts first: priority, then effective tempo, then a coin flip. */
function turnOrder(state: BattleState, playerAction: BattleAction, opponentAction: BattleAction, rng: Rng): Side[] {
  const pPrio = priorityOf(playerAction);
  const oPrio = priorityOf(opponentAction);
  if (pPrio !== oPrio) return pPrio > oPrio ? ["player", "opponent"] : ["opponent", "player"];

  const pSpeed = effectiveStat(state.player, "tempo");
  const oSpeed = effectiveStat(state.opponent, "tempo");
  if (pSpeed !== oSpeed) return pSpeed > oSpeed ? ["player", "opponent"] : ["opponent", "player"];

  return rng() < 0.5 ? ["player", "opponent"] : ["opponent", "player"];
}

function performTechnique(state: BattleState, side: Side, techniqueId: string, events: BattleEvent[], rng: Rng): void {
  const attacker = state[side];
  const defenderSide = other(side);
  const defender = state[defenderSide];
  const tech = getTechnique(techniqueId);
  if (!tech) return;

  events.push({ type: "action", side, technique: tech.name });

  if (rng() >= tech.accuracy) {
    events.push({ type: "miss", side });
    return;
  }

  if (tech.power > 0) {
    const effectiveness = getEffectivenessAgainst(tech.genre, defender.genres);
    const stab = attacker.genres.includes(tech.genre) ? STAB : 1;
    const randomFactor = 0.85 + rng() * 0.15;
    // The player's party and opponents take/deal scaled damage (balance knobs).
    const outputMultiplier = side === "player" ? BALANCE.playerDamageMultiplier : BALANCE.enemyDamageMultiplier;
    const amount = computeDamage({
      level: attacker.instance.level,
      power: tech.power,
      attack: effectiveStat(attacker, "skill"),
      defense: effectiveStat(defender, "composure"),
      stab,
      effectiveness,
      randomFactor,
      outputMultiplier,
    });
    defender.instance.currentStamina = Math.max(0, defender.instance.currentStamina - amount);
    events.push({
      type: "damage",
      target: defenderSide,
      amount,
      remaining: defender.instance.currentStamina,
      max: defender.instance.stats.stamina,
    });
    if (effectiveness !== 1) events.push({ type: "effectiveness", multiplier: effectiveness });
  }

  if (tech.effect && rng() < tech.effect.chance) {
    const targetSide = tech.effect.target === "self" ? side : defenderSide;
    const target = state[targetSide];
    const delta = tech.effect.kind === "buff" ? tech.effect.stages : -tech.effect.stages;
    target.stages[tech.effect.stat] = clampStage(target.stages[tech.effect.stat] + delta);
    events.push({ type: "statChange", target: targetSide, stat: tech.effect.stat, delta });
  }

  if (isFainted(defender)) events.push({ type: "faint", side: defenderSide });
}

/**
 * Resolve one full turn (both sides' actions) against `state`, MUTATING it, and
 * return the ordered events to render. Running pre-empts the turn. A KO ends the
 * turn (the fainted side does not act).
 */
export function resolveTurn(
  state: BattleState,
  playerAction: BattleAction,
  opponentAction: BattleAction,
  rng: Rng = Math.random,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (state.outcome !== "ongoing") return events;

  if (playerAction.kind === "run") {
    events.push({ type: "run", success: true });
    state.outcome = "fled";
    events.push({ type: "outcome", outcome: "fled" });
    return events;
  }

  const actions: Record<Side, BattleAction> = { player: playerAction, opponent: opponentAction };
  for (const side of turnOrder(state, playerAction, opponentAction, rng)) {
    if (isFainted(state[side])) continue;
    const action = actions[side];
    if (action.kind !== "perform") continue;
    performTechnique(state, side, action.techniqueId, events, rng);
    if (isFainted(state[other(side)])) break;
  }

  if (isFainted(state.opponent)) state.outcome = "player_won";
  else if (isFainted(state.player)) state.outcome = "player_lost";
  if (state.outcome !== "ongoing") events.push({ type: "outcome", outcome: state.outcome });

  return events;
}
