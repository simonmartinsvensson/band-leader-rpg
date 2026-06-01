import { describe, it, expect } from "vitest";
import {
  DEFAULT_AUDIO,
  VOLUME_STEPS,
  snapVolume,
  volumeUp,
  volumeDown,
  effectiveVolume,
  audioLabel,
  serializeAudio,
  parseAudio,
} from "../src/systems/audioSettings";

describe("audio settings", () => {
  it("snaps arbitrary volumes to the nearest step", () => {
    expect(snapVolume(0.3)).toBe(0.25);
    expect(snapVolume(0.6)).toBe(0.5);
    expect(snapVolume(0.9)).toBe(1.0);
    expect(VOLUME_STEPS).toContain(snapVolume(0.42));
  });

  it("steps volume up/down and clamps at the ends", () => {
    expect(volumeUp(0.5)).toBe(0.75);
    expect(volumeUp(1.0)).toBe(1.0); // clamps loud
    expect(volumeDown(0.5)).toBe(0.25);
    expect(volumeDown(0.25)).toBe(0.25); // clamps quiet
  });

  it("effective volume is zero when muted", () => {
    expect(effectiveVolume({ muted: false, volume: 0.75 })).toBe(0.75);
    expect(effectiveVolume({ muted: true, volume: 0.75 })).toBe(0);
  });

  it("labels the current state for the menu", () => {
    expect(audioLabel({ muted: false, volume: 0.5 })).toBe("50%");
    expect(audioLabel({ muted: true, volume: 0.5 })).toBe("Muted");
  });

  it("round-trips through serialize/parse", () => {
    const s = { muted: true, volume: 0.5 };
    expect(parseAudio(serializeAudio(s))).toEqual(s);
  });

  it("falls back to defaults for missing/corrupt data", () => {
    expect(parseAudio(null)).toEqual(DEFAULT_AUDIO);
    expect(parseAudio("not json")).toEqual(DEFAULT_AUDIO);
    // Partial/odd data: keep valid fields, snap volume, default the rest.
    expect(parseAudio(JSON.stringify({ volume: 0.42 }))).toEqual({ muted: false, volume: snapVolume(0.42) });
  });
});
