// Audio settings (mute + volume), persisted to localStorage independently of
// the save game — they're app preferences, not per-save state. The pure logic
// (parse/serialize/step/effective) is unit-testable; only the thin
// load/save wrappers touch localStorage (mirrors src/systems/save.ts).

export interface AudioSettings {
  muted: boolean;
  /** Master volume, one of VOLUME_STEPS (0.25..1). */
  volume: number;
}

export const DEFAULT_AUDIO: AudioSettings = { muted: false, volume: 0.75 };

/** Selectable volume levels (the pause menu steps through these). */
export const VOLUME_STEPS: readonly number[] = [0.25, 0.5, 0.75, 1.0];

const STORAGE_KEY = "band-leader-rpg/audio";

/** Snap an arbitrary volume to the nearest valid step. */
export function snapVolume(v: number): number {
  let best = VOLUME_STEPS[0];
  for (const step of VOLUME_STEPS) if (Math.abs(step - v) < Math.abs(best - v)) best = step;
  return best;
}

/** Next volume step up (clamped at the loudest). */
export function volumeUp(v: number): number {
  const i = VOLUME_STEPS.indexOf(snapVolume(v));
  return VOLUME_STEPS[Math.min(VOLUME_STEPS.length - 1, i + 1)];
}

/** Next volume step down (clamped at the quietest). */
export function volumeDown(v: number): number {
  const i = VOLUME_STEPS.indexOf(snapVolume(v));
  return VOLUME_STEPS[Math.max(0, i - 1)];
}

/** The volume actually applied (0 when muted). */
export function effectiveVolume(s: AudioSettings): number {
  return s.muted ? 0 : s.volume;
}

/** Human-readable label for the pause menu, e.g. "75%" or "Muted". */
export function audioLabel(s: AudioSettings): string {
  return s.muted ? "Muted" : `${Math.round(s.volume * 100)}%`;
}

export function serializeAudio(s: AudioSettings): string {
  return JSON.stringify({ muted: s.muted, volume: s.volume });
}

/** Parse + validate stored JSON, falling back to defaults for missing/bad data. */
export function parseAudio(raw: string | null): AudioSettings {
  if (!raw) return { ...DEFAULT_AUDIO };
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      muted: typeof p.muted === "boolean" ? p.muted : DEFAULT_AUDIO.muted,
      volume: typeof p.volume === "number" ? snapVolume(p.volume) : DEFAULT_AUDIO.volume,
    };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

// --- localStorage wrappers (browser only; all guarded) -----------------------

export function loadAudioSettings(): AudioSettings {
  try {
    return parseAudio(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

export function saveAudioSettings(s: AudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeAudio(s));
  } catch {
    /* ignore (private mode / unavailable) */
  }
}
