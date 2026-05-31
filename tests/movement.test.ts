import { describe, it, expect } from "vitest";
import { Player } from "../src/systems/Player";
import { MovementController, REPEAT_DELAY } from "../src/systems/MovementController";
import type { Direction } from "../src/types/direction";
import type { WorldGrid } from "../src/types/grid";

/** An open field with no blocked tiles. */
function openWorld(): WorldGrid {
  return { cols: 15, rows: 10, isBlocked: () => false };
}

// A minimal stand-in for the bits of Phaser.Scene that Player touches. Tweens
// don't run on a clock here — the test completes them explicitly to model a
// step finishing, which is exactly the moment the tap-vs-hold bug surfaced.
function makeFakeScene() {
  const sprite = {
    x: 0,
    y: 0,
    texture: { frameTotal: 5 }, // 4 directional frames + base => use directional frames
    setOrigin() {
      return sprite;
    },
    setDepth() {
      return sprite;
    },
    setFrame() {
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
  const completeLastStep = () => {
    const cfg = tweens[tweens.length - 1];
    sprite.x = cfg.x;
    sprite.y = cfg.y;
    cfg.onComplete?.();
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { scene: scene as any, sprite, tweens, completeLastStep };
}

/** Run one frame: held-key -> intent -> player. */
function frame(
  player: Player,
  input: MovementController,
  held: Direction | null,
  time: number,
) {
  player.update(input.update(held ? [held] : [], time));
}

describe("grid movement: tap vs hold", () => {
  it("a single tap moves exactly one tile, even when the tap outlasts a step", () => {
    const { scene, tweens, completeLastStep } = makeFakeScene();
    const player = new Player(scene, 7, 5, openWorld());
    const input = new MovementController();

    // Key down -> exactly one step begins.
    frame(player, input, "right", 0);
    expect(tweens.length).toBe(1);
    expect(player.isMoving).toBe(true);

    // The step tween finishes (models STEP_DURATION elapsing).
    completeLastStep();
    expect(player.tileX).toBe(8);
    expect(player.isMoving).toBe(false);

    // Key is STILL physically down past the step but well within REPEAT_DELAY:
    // this is the original bug — it must NOT trigger a second step.
    frame(player, input, "right", 160);
    frame(player, input, "right", 180);
    expect(tweens.length).toBe(1);

    // Release + idle frames: still exactly one tile moved.
    frame(player, input, null, 200);
    frame(player, input, null, 220);
    expect(player.tileX).toBe(8);
    expect(tweens.length).toBe(1);
  });

  it("holding past the repeat delay steps again (auto-repeat)", () => {
    const { scene, tweens, completeLastStep } = makeFakeScene();
    const player = new Player(scene, 7, 5, openWorld());
    const input = new MovementController();

    frame(player, input, "right", 0); // step 1 on key-down
    completeLastStep();
    expect(player.tileX).toBe(8);

    // Held but before the repeat delay -> no new step.
    frame(player, input, "right", REPEAT_DELAY - 1);
    expect(tweens.length).toBe(1);

    // Held past the repeat delay -> auto-repeat fires the next step.
    frame(player, input, "right", REPEAT_DELAY + 10);
    expect(tweens.length).toBe(2);
    completeLastStep();
    expect(player.tileX).toBe(9);
  });

  it("a second discrete tap after release moves exactly one more tile", () => {
    const { scene, tweens, completeLastStep } = makeFakeScene();
    const player = new Player(scene, 7, 5, openWorld());
    const input = new MovementController();

    frame(player, input, "down", 0);
    completeLastStep();
    frame(player, input, null, 100); // release

    frame(player, input, "down", 300); // fresh tap (new edge)
    expect(tweens.length).toBe(2);
    completeLastStep();
    expect(player.tileY).toBe(7); // 5 -> 6 -> 7, exactly two single steps
  });

  it("does not step onto a blocked tile (collision respects the grid)", () => {
    const { scene, tweens } = makeFakeScene();
    // Block the tile directly to the right of the player at (7,5).
    const world: WorldGrid = {
      cols: 15,
      rows: 10,
      isBlocked: (x, y) => x === 8 && y === 5,
    };
    const player = new Player(scene, 7, 5, world);
    const input = new MovementController();

    frame(player, input, "right", 0);
    expect(tweens.length).toBe(0); // no step started
    expect(player.isMoving).toBe(false);
    expect(player.tileX).toBe(7); // stayed put
    expect(player.direction).toBe("right"); // but still turned to face the wall
  });

  it("works the same in every direction", () => {
    for (const [dir, axis, delta] of [
      ["up", "tileY", -1],
      ["down", "tileY", 1],
      ["left", "tileX", -1],
      ["right", "tileX", 1],
    ] as const) {
      const { scene, completeLastStep } = makeFakeScene();
      const player = new Player(scene, 7, 5, openWorld());
      const input = new MovementController();
      const start = player[axis];

      frame(player, input, dir, 0);
      completeLastStep();
      frame(player, input, dir, 160); // tap outlasts step, within repeat delay
      frame(player, input, null, 200);

      expect(player[axis]).toBe(start + delta);
    }
  });
});

describe("MovementController edge detection", () => {
  it("emits one intent on key-down then nothing until the repeat delay", () => {
    const input = new MovementController();
    expect(input.update(["right"], 0)).toBe("right"); // edge
    expect(input.update(["right"], 50)).toBeNull();
    expect(input.update(["right"], REPEAT_DELAY - 1)).toBeNull();
    expect(input.update(["right"], REPEAT_DELAY)).toBe("right"); // auto-repeat
    expect(input.update(["right"], REPEAT_DELAY + 16)).toBe("right");
  });

  it("treats switching direction as a fresh edge (instant turn)", () => {
    const input = new MovementController();
    expect(input.update(["right"], 0)).toBe("right");
    expect(input.update(["down"], 16)).toBe("down"); // immediate, no delay
    expect(input.update(["down"], 32)).toBeNull();
  });

  it("resets on release", () => {
    const input = new MovementController();
    expect(input.update(["up"], 0)).toBe("up");
    expect(input.update([], 16)).toBeNull();
    expect(input.update(["up"], 32)).toBe("up"); // new edge after release
  });
});

describe("MovementController last-pressed-wins", () => {
  it("holding Up then pressing Right switches to Right immediately", () => {
    const input = new MovementController();
    expect(input.update(["up"], 0)).toBe("up"); // edge up
    expect(input.update(["up"], 50)).toBeNull(); // held, within delay
    // Press Right while Up is still held -> newest wins, instant edge step.
    expect(input.update(["up", "right"], 60)).toBe("right");
  });

  it("releasing the newer key falls back to the still-held older key", () => {
    const input = new MovementController();
    input.update(["up"], 0);
    expect(input.update(["up", "right"], 10)).toBe("right");
    // Release Right; Up is still held -> fall back to Up with no re-press.
    expect(input.update(["up"], 20)).toBe("up");
  });

  it("active is the most-recently-pressed held key, not a fixed priority", () => {
    const input = new MovementController();
    // Fixed priority (down>up>left>right) would keep picking 'down'; recency must not.
    expect(input.update(["down"], 0)).toBe("down");
    expect(input.update(["down", "left"], 10)).toBe("left"); // newest = left
    expect(input.update(["down", "left", "right"], 20)).toBe("right"); // newest = right
    expect(input.update(["down", "left"], 30)).toBe("left"); // release right -> back to left
    expect(input.update(["down"], 40)).toBe("down"); // release left -> back to down
  });

  it("rapid direction changes while moving never stall (no coming to a stop)", () => {
    const input = new MovementController();
    input.update(["up"], 0); // edge up
    input.update(["up"], REPEAT_DELAY); // now auto-repeating (walking)

    // Each subsequent frame must yield a step (non-null) — the walk continues
    // seamlessly through the direction changes.
    expect(input.update(["up", "right"], 210)).toBe("right"); // switch
    expect(input.update(["up", "right"], 220)).toBe("right"); // keeps walking, no re-delay
    expect(input.update(["up", "right", "down"], 230)).toBe("down"); // switch again
    expect(input.update(["up", "down"], 240)).toBe("down"); // release right, down still newest
    expect(input.update(["up"], 250)).toBe("up"); // release down -> back to up
    expect(input.update(["up"], 260)).toBe("up"); // still walking
  });
});
