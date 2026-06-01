import { describe, it, expect } from "vitest";
import type { Milestone } from "../src/types/story";
import type { StoryEvent, EventStep } from "../src/types/event";
import {
  isFlagSet,
  setStoryFlag,
  flagsAllow,
  currentMilestone,
  currentObjective,
  currentChapter,
  completedMilestones,
  storyComplete,
  interpolate,
} from "../src/systems/story";
import { runCutscene, eventEligible, triggerMatches, findEvent, type CutsceneHandlers } from "../src/systems/cutscene";
import { addItem } from "../src/systems/inventory";

// --- Story progress ----------------------------------------------------------

const STORY: Milestone[] = [
  { id: "m1", chapter: "Chapter 1", objective: "Do the first thing", flag: "f.one" },
  { id: "m2", chapter: "Chapter 1", objective: "Do the second thing", flag: "f.two" },
  { id: "m3", chapter: "Chapter 2", objective: "Do the third thing", flag: "f.three" },
];

describe("story flags", () => {
  it("reads and sets flags", () => {
    const flags: Record<string, boolean> = {};
    expect(isFlagSet(flags, "x")).toBe(false);
    setStoryFlag(flags, "x");
    expect(isFlagSet(flags, "x")).toBe(true);
    setStoryFlag(flags, "x", false);
    expect(isFlagSet(flags, "x")).toBe(false);
  });

  it("gates on requires (all set) and forbids (none set)", () => {
    const flags = { a: true, b: true, bad: true };
    expect(flagsAllow(flags, ["a", "b"])).toBe(true);
    expect(flagsAllow(flags, ["a", "missing"])).toBe(false);
    expect(flagsAllow(flags, ["a"], ["bad"])).toBe(false);
    expect(flagsAllow(flags, undefined, ["bad"])).toBe(false);
    expect(flagsAllow(flags)).toBe(true); // empty gate always passes
  });
});

describe("story progression", () => {
  it("tracks the current milestone/objective/chapter from flags", () => {
    const flags: Record<string, boolean> = {};
    expect(currentMilestone(STORY, flags)?.id).toBe("m1");
    expect(currentObjective(STORY, flags)).toBe("Do the first thing");
    expect(currentChapter(STORY, flags)).toBe("Chapter 1");

    setStoryFlag(flags, "f.one");
    expect(currentMilestone(STORY, flags)?.id).toBe("m2");

    setStoryFlag(flags, "f.two");
    expect(currentChapter(STORY, flags)).toBe("Chapter 2");
    expect(completedMilestones(STORY, flags).map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("reports completion once every flag is set", () => {
    const flags = { "f.one": true, "f.two": true, "f.three": true };
    expect(storyComplete(STORY, flags)).toBe(true);
    expect(currentObjective(STORY, flags)).toBe(""); // nothing left
    expect(currentChapter(STORY, flags)).toBe("Chapter 2"); // last chapter
  });

  it("treats an empty story as not complete", () => {
    expect(storyComplete([], {})).toBe(false);
    expect(currentObjective([], {})).toBe("");
  });
});

describe("interpolate (name surfacing)", () => {
  it("substitutes known tokens and leaves unknown ones", () => {
    expect(interpolate("Hi {name}!", { name: "Riff" })).toBe("Hi Riff!");
    expect(interpolate("Go {name}, win {place}", { name: "Riff" })).toBe("Go Riff, win {place}");
    expect(interpolate("no tokens", { name: "Riff" })).toBe("no tokens");
  });
});

// --- Cutscene gating ---------------------------------------------------------

describe("event eligibility + triggers", () => {
  const ev = (over: Partial<StoryEvent>): StoryEvent => ({
    id: "e",
    trigger: { type: "enterTile", map: "town", x: 1, y: 2 },
    steps: [],
    ...over,
  });

  it("respects requires / forbids / once", () => {
    expect(eventEligible(ev({ requires: ["a"] }), { a: true })).toBe(true);
    expect(eventEligible(ev({ requires: ["a"] }), {})).toBe(false);
    expect(eventEligible(ev({ forbids: ["b"] }), { b: true })).toBe(false);
    expect(eventEligible(ev({ once: "seen" }), { seen: true })).toBe(false);
    expect(eventEligible(ev({ once: "seen" }), {})).toBe(true);
  });

  it("matches each trigger type", () => {
    expect(triggerMatches({ type: "enterMap", map: "town" }, { type: "enterMap", map: "town" })).toBe(true);
    expect(triggerMatches({ type: "enterMap", map: "town" }, { type: "enterMap", map: "street" })).toBe(false);
    expect(
      triggerMatches({ type: "enterTile", map: "town", x: 3, y: 4 }, { type: "enterTile", map: "town", x: 3, y: 4 }),
    ).toBe(true);
    expect(
      triggerMatches({ type: "enterTile", map: "town", x: 3, y: 4 }, { type: "enterTile", map: "town", x: 3, y: 9 }),
    ).toBe(false);
    expect(triggerMatches({ type: "interact", object: "max" }, { type: "interact", map: "town", object: "max" })).toBe(
      true,
    );
    // Wrong category never matches.
    expect(triggerMatches({ type: "enterMap", map: "town" }, { type: "enterTile", map: "town", x: 1, y: 1 })).toBe(
      false,
    );
  });

  it("findEvent picks the first matching + eligible event", () => {
    const events: StoryEvent[] = [
      ev({ id: "locked", requires: ["nope"] }),
      ev({ id: "open" }),
      ev({ id: "later" }),
    ];
    const ctx = { type: "enterTile" as const, map: "town", x: 1, y: 2 };
    expect(findEvent(events, ctx, {})?.id).toBe("open"); // skips the locked one
  });
});

// --- Cutscene runner (throwaway test event end-to-end) -----------------------

describe("runCutscene", () => {
  it("plays a throwaway event's steps in order and applies state", async () => {
    // A throwaway event exercising every step kind.
    const event: StoryEvent = {
      id: "test_event",
      trigger: { type: "interact", object: "tester" },
      once: "story.test_done",
      steps: [
        { kind: "turn", actor: "player", facing: "left" },
        { kind: "dialogue", speaker: "Tester", pages: ["Hi", "Bye"] },
        { kind: "walk", actor: "npc1", path: ["up", "up"] },
        { kind: "wait", ms: 50 },
        { kind: "setFlag", flag: "story.met_tester" },
        { kind: "giveItem", item: "snack", qty: 2 },
        { kind: "giveCurrency", amount: 100 },
        { kind: "battle", species: "grooveling", level: 3 },
      ] satisfies EventStep[],
    };

    const log: string[] = [];
    const flags: Record<string, boolean> = {};
    const bag: Record<string, number> = {};
    let currency = 0;

    const handlers: CutsceneHandlers = {
      dialogue: async (speaker, pages) => void log.push(`dialogue:${speaker}:${pages.join("|")}`),
      wait: async (ms) => void log.push(`wait:${ms}`),
      turn: (actor, facing) => void log.push(`turn:${actor}:${facing}`),
      walk: async (actor, path) => void log.push(`walk:${actor}:${path.join(",")}`),
      battle: async (step) => void log.push(`battle:${step.species}:${step.level}`),
      setFlag: (flag, value) => setStoryFlag(flags, flag, value),
      giveItem: (item, qty) => addItem(bag, item, qty),
      giveCurrency: (amount) => {
        currency += amount;
      },
    };

    await runCutscene(event.steps, handlers);

    expect(log).toEqual([
      "turn:player:left",
      "dialogue:Tester:Hi|Bye",
      "walk:npc1:up,up",
      "wait:50",
      "battle:grooveling:3",
    ]);
    expect(flags["story.met_tester"]).toBe(true);
    expect(bag.snack).toBe(2);
    expect(currency).toBe(100);

    // The `once` flag is applied by the scene after the run; emulate + verify gating.
    expect(eventEligible(event, flags)).toBe(true);
    setStoryFlag(flags, event.once!);
    expect(eventEligible(event, flags)).toBe(false);
  });
});
