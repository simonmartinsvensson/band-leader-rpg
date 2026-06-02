import type { Direction } from "../types/direction";
import type { EventStep, EventTrigger, StoryEvent, TriggerContext } from "../types/event";
import { flagsAllow, type Flags } from "./story";

// Scripted-event ("cutscene") engine. Pure + unit-tested: it decides which
// event fires (trigger match + flag gate) and sequences a list of steps,
// delegating the actual effects to injected handlers. The overworld provides
// handlers that move sprites, show dialogue, start battles, etc.; tests provide
// mock handlers and assert the call order + state changes.

/** Effects the runner delegates to. Async handlers are awaited in order. */
export interface CutsceneHandlers {
  dialogue(speaker: string | undefined, pages: string[]): Promise<void> | void;
  /** Prompt for and persist the player's name (handler stores it). */
  nameEntry(prompt: string | undefined, fallback: string | undefined): Promise<void> | void;
  wait(ms: number): Promise<void> | void;
  turn(actor: string, facing: Direction): Promise<void> | void;
  walk(actor: string, path: Direction[]): Promise<void> | void;
  battle(step: Extract<EventStep, { kind: "battle" }>): Promise<void> | void;
  win(): Promise<void> | void;
  setFlag(flag: string, value: boolean): void;
  giveItem(item: string, qty: number): void;
  giveCurrency(amount: number): void;
}

/** Play a list of steps in order, awaiting each (so timing/animation can pace). */
export async function runCutscene(steps: EventStep[], h: CutsceneHandlers): Promise<void> {
  for (const step of steps) {
    switch (step.kind) {
      case "dialogue":
        await h.dialogue(step.speaker, step.pages);
        break;
      case "nameEntry":
        await h.nameEntry(step.prompt, step.default);
        break;
      case "wait":
        await h.wait(step.ms);
        break;
      case "turn":
        await h.turn(step.actor, step.facing);
        break;
      case "walk":
        await h.walk(step.actor, step.path);
        break;
      case "battle":
        await h.battle(step);
        break;
      case "win":
        await h.win();
        break;
      case "setFlag":
        h.setFlag(step.flag, step.value ?? true);
        break;
      case "giveItem":
        h.giveItem(step.item, step.qty ?? 1);
        break;
      case "giveCurrency":
        h.giveCurrency(step.amount);
        break;
    }
  }
}

/** Whether an event is eligible to fire given current flags (ignores trigger). */
export function eventEligible(event: StoryEvent, flags: Flags): boolean {
  if (event.once && flags[event.once] === true) return false;
  return flagsAllow(flags, event.requires, event.forbids);
}

/** Whether a trigger matches the current situation. */
export function triggerMatches(trigger: EventTrigger, ctx: TriggerContext): boolean {
  if (trigger.type !== ctx.type) return false;
  switch (trigger.type) {
    case "enterMap":
      return trigger.map === ctx.map;
    case "enterTile":
      return trigger.map === ctx.map && trigger.x === ctx.x && trigger.y === ctx.y;
    case "interact":
      return trigger.object === ctx.object;
  }
}

/** The first event whose trigger matches the context AND is flag-eligible. */
export function findEvent(events: StoryEvent[], ctx: TriggerContext, flags: Flags): StoryEvent | undefined {
  return events.find((e) => triggerMatches(e.trigger, ctx) && eventEligible(e, flags));
}
