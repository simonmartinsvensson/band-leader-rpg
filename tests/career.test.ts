import { describe, it, expect } from "vitest";
import {
  isTrainerDefeated,
  markTrainerDefeated,
  hasResidency,
  addResidency,
  buildTrainerTeam,
  lineOfSight,
} from "../src/systems/career";
import { TRAINERS } from "../src/data/trainers";

describe("defeated trainers & residencies", () => {
  it("marks and checks defeated trainers", () => {
    const defeated: Record<string, boolean> = {};
    expect(isTrainerDefeated(defeated, "rival_max")).toBe(false);
    markTrainerDefeated(defeated, "rival_max");
    expect(isTrainerDefeated(defeated, "rival_max")).toBe(true);
  });

  it("adds residencies without duplicating", () => {
    const res: string[] = [];
    addResidency(res, "jazz");
    addResidency(res, "jazz");
    expect(res).toEqual(["jazz"]);
    expect(hasResidency(res, "jazz")).toBe(true);
    expect(hasResidency(res, "rock")).toBe(false);
  });
});

describe("buildTrainerTeam", () => {
  it("builds live instances at the trainer's levels", () => {
    const team = buildTrainerTeam(TRAINERS.jazz_headliner);
    expect(team).toHaveLength(2);
    expect(team[0].speciesId).toBe("crooner");
    expect(team[0].level).toBe(9);
    expect(team[1].level).toBe(10);
    expect(team[0].currentStamina).toBe(team[0].stats.stamina); // full
  });
});

describe("lineOfSight", () => {
  const open = () => false;
  it("sees a target straight ahead within range", () => {
    // trainer at (5,5) facing down, range 3
    expect(lineOfSight(5, 5, "down", 3, 5, 7, open)).toBe(true);
    expect(lineOfSight(5, 5, "down", 3, 5, 8, open)).toBe(true);
    expect(lineOfSight(5, 5, "down", 3, 5, 9, open)).toBe(false); // out of range
    expect(lineOfSight(5, 5, "down", 3, 6, 7, open)).toBe(false); // off the line
    expect(lineOfSight(5, 5, "up", 3, 5, 7, open)).toBe(false); // wrong direction
  });

  it("is blocked by a wall between the trainer and target", () => {
    const wallAt6 = (x: number, y: number) => x === 5 && y === 6;
    expect(lineOfSight(5, 5, "down", 3, 5, 7, wallAt6)).toBe(false);
  });
});
