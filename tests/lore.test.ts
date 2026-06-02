import { describe, it, expect } from "vitest";
import { LORE, getLore } from "../src/data/lore";
import { isLoreFound, foundLore, loreProgress } from "../src/systems/lore";
import type { Flags } from "../src/systems/story";

describe("collectible lore", () => {
  it("has well-formed entries with unique ids and flags", () => {
    expect(LORE.length).toBeGreaterThanOrEqual(6);
    const ids = new Set(LORE.map((e) => e.id));
    const flags = new Set(LORE.map((e) => e.flag));
    expect(ids.size, "unique ids").toBe(LORE.length);
    expect(flags.size, "unique flags").toBe(LORE.length);
    for (const e of LORE) {
      expect(e.flag.startsWith("lore."), `${e.id} flag namespaced`).toBe(true);
      expect(e.pages.length, `${e.id} has pages`).toBeGreaterThan(0);
      expect(getLore(e.id)).toBe(e);
    }
  });

  it("tracks found entries + progress from the flags", () => {
    const flags: Flags = {};
    expect(loreProgress(LORE, flags)).toEqual({ found: 0, total: LORE.length });
    expect(foundLore(LORE, flags)).toEqual([]);

    flags[LORE[0].flag] = true;
    flags[LORE[2].flag] = true;
    expect(isLoreFound(flags, LORE[0])).toBe(true);
    expect(isLoreFound(flags, LORE[1])).toBe(false);
    expect(foundLore(LORE, flags).map((e) => e.id)).toEqual([LORE[0].id, LORE[2].id]); // definition order
    expect(loreProgress(LORE, flags).found).toBe(2);
  });
});
