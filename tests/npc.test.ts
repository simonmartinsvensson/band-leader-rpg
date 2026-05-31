import { describe, it, expect } from "vitest";
import { NPC } from "../src/systems/NPC";

// Minimal fake scene: NPC only touches scene.add.sprite and scene.tweens.add.
function makeFakeScene() {
  const sprite = {
    x: 0,
    y: 0,
    setOrigin() {
      return sprite;
    },
    setDepth() {
      return sprite;
    },
    setTint() {
      return sprite;
    },
  };
  const tweens: Array<{ x: number; y: number; onComplete?: () => void }> = [];
  const scene = {
    add: {
      sprite(x: number, y: number) {
        sprite.x = x;
        sprite.y = y;
        return sprite;
      },
    },
    tweens: {
      add(cfg: { x: number; y: number; onComplete?: () => void }) {
        tweens.push(cfg);
        return cfg;
      },
    },
  };
  const completeLastStep = () => tweens[tweens.length - 1]?.onComplete?.();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { scene: scene as any, tweens, completeLastStep };
}

const at = (x: number, y: number) => ({ id: "x", tileX: x, tileY: y, facing: "down" as const });

describe("NPC", () => {
  it("occupies (blocks) its current tile", () => {
    const { scene } = makeFakeScene();
    const npc = new NPC(scene, { ...at(5, 5), wander: false }, () => true);
    expect(npc.occupies(5, 5)).toBe(true);
    expect(npc.occupies(5, 6)).toBe(false);
  });

  it("faces a direction without moving", () => {
    const { scene, tweens } = makeFakeScene();
    const npc = new NPC(scene, { ...at(5, 5), wander: false }, () => true);
    npc.faceTo("left");
    expect(npc.facingDirection).toBe("left");
    expect(npc.occupies(5, 5)).toBe(true);
    expect(tweens.length).toBe(0);
  });

  it("a stationary NPC never wanders", () => {
    const { scene, tweens } = makeFakeScene();
    const npc = new NPC(scene, { ...at(5, 5), wander: false }, () => true);
    npc.update(1_000_000);
    expect(tweens.length).toBe(0);
    expect(npc.occupies(5, 5)).toBe(true);
  });

  it("a wanderer steps exactly one tile into a free neighbour and reserves it", () => {
    const { scene, tweens, completeLastStep } = makeFakeScene();
    const npc = new NPC(scene, { ...at(5, 5), wander: true }, () => true);
    npc.update(1_000_000); // past any initial wander delay

    expect(tweens.length).toBe(1);
    // Reserved the target tile immediately (occupies the new tile, not the old).
    const moved = !npc.occupies(5, 5);
    expect(moved).toBe(true);
    const dx = Math.abs(npc.tileX - 5);
    const dy = Math.abs(npc.tileY - 5);
    expect(dx + dy).toBe(1); // exactly one cardinal step

    completeLastStep();
    npc.update(1_000_001); // immediately after: respects the next-wander delay
    expect(tweens.length).toBe(1);
  });

  it("a wanderer stays put when every neighbour is blocked", () => {
    const { scene, tweens } = makeFakeScene();
    const npc = new NPC(scene, { ...at(5, 5), wander: true }, () => false);
    npc.update(1_000_000);
    expect(tweens.length).toBe(0);
    expect(npc.occupies(5, 5)).toBe(true);
  });
});
