import { describe, it, expect } from "vitest";
import { MAPS } from "../src/data/maps";
import { DIALOGUES } from "../src/data/dialogues";
import { TRAINERS } from "../src/data/trainers";
import { ENCOUNTER_ZONES } from "../src/data/encounters";
import { getLore } from "../src/data/lore";
import { EVENTS } from "../src/data/events";
import { findEvent } from "../src/systems/cutscene";
import type { Flags } from "../src/systems/story";

// --- helpers to read the (Tiled JSON) maps ----------------------------------
interface MapObj {
  name: string;
  type: string;
  props: Record<string, string | number | boolean>;
}
function objectsOf(mapData: unknown): MapObj[] {
  const layers = (mapData as { layers?: Array<{ name: string; objects?: unknown[] }> }).layers ?? [];
  const group = layers.find((l) => l.name === "objects");
  return ((group?.objects ?? []) as Array<{ name?: string; type?: string; properties?: Array<{ name: string; value: unknown }> }>).map(
    (o) => {
      const props: Record<string, string | number | boolean> = {};
      for (const p of o.properties ?? []) props[p.name] = p.value as string | number | boolean;
      return { name: o.name ?? "", type: o.type ?? "", props };
    },
  );
}
const hasEntry = (mapData: unknown, name: string) =>
  objectsOf(mapData).some((o) => o.type === "entry" && o.name === name);

// --- data integrity: every map reference resolves ----------------------------
describe("map object references resolve", () => {
  it("every warp/gate points at a real map + entry", () => {
    for (const [key, data] of Object.entries(MAPS)) {
      for (const o of objectsOf(data)) {
        if (o.type !== "warp" && o.type !== "gate") continue;
        const target = String(o.props.target);
        expect(MAPS[target], `${key}/${o.name} -> map ${target}`).toBeDefined();
        expect(hasEntry(MAPS[target], String(o.props.entry)), `${key}/${o.name} -> entry ${o.props.entry}`).toBe(true);
      }
    }
  });

  it("every npc dialogue, trainer, and encounter zone exists", () => {
    for (const [key, data] of Object.entries(MAPS)) {
      for (const o of objectsOf(data)) {
        if (o.type === "npc" && o.props.dialogue !== undefined)
          expect(DIALOGUES[String(o.props.dialogue)], `${key}/${o.name} dialogue`).toBeDefined();
        if (o.type === "trainer") expect(TRAINERS[String(o.props.trainer)], `${key}/${o.name} trainer`).toBeDefined();
        if (o.type === "encounter") expect(ENCOUNTER_ZONES[String(o.props.zone)], `${key}/${o.name} zone`).toBeDefined();
        if (o.type === "lore") expect(getLore(String(o.props.lore)), `${key}/${o.name} lore`).toBeDefined();
      }
    }
  });
});

// --- events: every battle step / dialogue is well-formed ---------------------
describe("events are well-formed", () => {
  it("every battle step names a real trainer (or species), every dialogue has content", () => {
    for (const ev of EVENTS) {
      for (const step of ev.steps) {
        if (step.kind === "battle") {
          if (step.trainer) expect(TRAINERS[step.trainer], `${ev.id}: trainer ${step.trainer}`).toBeDefined();
          else expect(step.species, `${ev.id}: battle needs trainer or species`).toBeTruthy();
        }
        if (step.kind === "dialogue") {
          expect(step.speaker, `${ev.id}: dialogue speaker`).toBeTruthy();
          expect(step.pages.length, `${ev.id}: dialogue pages`).toBeGreaterThan(0);
        }
      }
    }
  });
});

// --- the rival arc: chained, gated, one beat eligible at a time --------------
describe("rival arc gating", () => {
  const interactId = (object: string, flags: Flags) =>
    findEvent(EVENTS, { type: "interact", map: "", object }, flags)?.id;

  it("walks the relationship through five beats in order", () => {
    // After beat 1 (met the rival in town):
    let f: Flags = { "story.intro_done": true, "story.met_rival": true };
    expect(interactId("rival_rock", f)).toBe("beat_rival2");
    expect(interactId("rival_funk", f)).toBeUndefined(); // not yet
    expect(interactId("rival_max", f)).toBeUndefined(); // beat 1 done, beat 5 far off

    // Beat 2 done -> beat 3 unlocks, beat 2 won't replay.
    f = { ...f, "story.rival2_done": true };
    expect(interactId("rival_rock", f)).toBeUndefined();
    expect(interactId("rival_funk", f)).toBe("beat_rival3");

    // Beat 3 -> 4.
    f = { ...f, "story.rival3_done": true };
    expect(interactId("rival_funk", f)).toBeUndefined();
    expect(interactId("rival_classical", f)).toBe("beat_rival4");

    // Beat 4 done (signed) -> beat 5 still needs the last venue.
    f = { ...f, "story.rival4_done": true, "story.rival_signed": true };
    expect(interactId("rival_classical", f)).toBeUndefined();
    expect(interactId("rival_max", f)).toBeUndefined();

    // The final venue cleared -> beat 5 (redemption) unlocks in town.
    f = { ...f, "story.classical_won": true };
    expect(interactId("rival_max", f)).toBe("beat_rival5");

    // Beat 5 done -> arc complete, nothing re-fires.
    f = { ...f, "story.rival5_done": true, "story.rival_redeemed": true };
    expect(interactId("rival_max", f)).toBeUndefined();
  });
});

describe("Vy's backstory arc gating", () => {
  const mentor = (flags: Flags) => findEvent(EVENTS, { type: "interact", map: "", object: "mentor" }, flags)?.id;

  it("reveals the Cass backstory across the circuit, one scene at a time", () => {
    // Opening warning done; first venue unlocks scene 2.
    let f: Flags = { "story.saw_monocorp": true, "story.mentor_warning": true };
    expect(mentor(f)).toBeUndefined(); // needs a venue first
    f = { ...f, "story.jazz_won": true };
    expect(mentor(f)).toBe("vy_arc_2");

    f = { ...f, "story.vy2_done": true };
    expect(mentor(f)).toBeUndefined(); // needs the 2nd venue
    f = { ...f, "story.electronic_won": true };
    expect(mentor(f)).toBe("vy_arc_3");

    f = { ...f, "story.vy3_done": true };
    expect(mentor(f)).toBeUndefined(); // needs the last district venue
    f = { ...f, "story.classical_won": true };
    expect(mentor(f)).toBe("vy_arc_4");

    f = { ...f, "story.vy4_done": true };
    expect(mentor(f)).toBeUndefined();
  });
});

// --- escalation invariants ---------------------------------------------------
const totalLevel = (id: string) => TRAINERS[id].team.reduce((s, m) => s + m.level, 0);

describe("the world reacts (flavour NPCs)", () => {
  const interactId = (object: string, flags: Flags) =>
    findEvent(EVENTS, { type: "interact", map: "", object }, flags)?.id;

  it("district locals change their line once their venue is won", () => {
    expect(interactId("rock_local", {})).toBeUndefined(); // base dialogue before
    expect(interactId("rock_local", { "story.rock_won": true })).toBe("react_rock_local");
  });

  it("the busker tracks the rival's arc, most-progressed line winning", () => {
    expect(interactId("busker", {})).toBeUndefined(); // base dialogue
    expect(interactId("busker", { "story.rival_signed": true })).toBe("react_busker_signed");
    // Redeemed supersedes signed; post-game supersedes both (mutually exclusive).
    expect(interactId("busker", { "story.rival_signed": true, "story.rival_redeemed": true })).toBe(
      "react_busker_redeemed",
    );
    expect(
      interactId("busker", { "story.rival_redeemed": true, "story.game_complete": true }),
    ).toBe("react_busker_postgame");
  });
});

describe("recurring trainers escalate", () => {
  it("the rival's teams grow stronger each beat", () => {
    const chain = ["rival_max", "rival_max_2", "rival_max_3", "rival_max_4", "rival_max_5"];
    for (let i = 1; i < chain.length; i++) {
      expect(totalLevel(chain[i]), `${chain[i]} > ${chain[i - 1]}`).toBeGreaterThan(totalLevel(chain[i - 1]));
    }
  });

  it("Monocorp A&R reps escalate across districts", () => {
    const reps = ["ar_rep_strip", "ar_rep_block", "ar_rep_hall"];
    for (let i = 1; i < reps.length; i++) {
      expect(totalLevel(reps[i])).toBeGreaterThan(totalLevel(reps[i - 1]));
    }
  });
});
