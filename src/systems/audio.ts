import {
  type AudioSettings,
  DEFAULT_AUDIO,
  effectiveVolume,
  loadAudioSettings,
  saveAudioSettings,
  volumeDown,
  volumeUp,
} from "./audioSettings";

// Game-global audio manager. Wraps Phaser's (game-scoped) sound manager so
// background music persists across scene transitions (overworld <-> battle
// overlays) and a single mute/volume setting governs everything. Phaser is a
// type-only import here; the runtime sound manager is injected via init().

/** The slice of Phaser's sound manager we use (kept minimal + version-proof). */
interface SoundManager {
  game: { cache: { audio: { exists(key: string): boolean } } };
  add(key: string, config?: object): PlayableSound;
  play(key: string, config?: object): boolean;
}
interface PlayableSound {
  play(config?: object): boolean;
  stop(): boolean;
  destroy(): void;
  setVolume?(value: number): void;
  volume?: number;
  isPlaying?: boolean;
}

/** Relative mix: music sits well under SFX so it stays in the background. */
const MUSIC_GAIN = 0.5;
const SFX_GAIN = 0.85;

class AudioManager {
  private mgr?: SoundManager;
  private settings: AudioSettings = { ...DEFAULT_AUDIO };
  private music?: PlayableSound;
  private currentKey?: string;

  /** Attach the live sound manager and load persisted settings. Idempotent. */
  init(mgr: SoundManager): void {
    this.mgr = mgr;
    this.settings = loadAudioSettings();
    if (this.currentKey) this.applyMusicVolume();
  }

  getSettings(): AudioSettings {
    return this.settings;
  }

  // --- settings (persisted) --------------------------------------------------

  private commit(next: AudioSettings): void {
    this.settings = next;
    saveAudioSettings(next);
    this.applyMusicVolume();
  }

  toggleMute(): void {
    this.commit({ ...this.settings, muted: !this.settings.muted });
  }

  /** Step volume up; bump also unmutes so the change is audible. */
  raiseVolume(): void {
    this.commit({ muted: false, volume: volumeUp(this.settings.volume) });
  }

  lowerVolume(): void {
    this.commit({ muted: false, volume: volumeDown(this.settings.volume) });
  }

  // --- music -----------------------------------------------------------------

  /** Start (looping) the given music key; a no-op if it's already playing. */
  playMusic(key: string): void {
    if (!this.mgr || key === this.currentKey) return;
    this.stopMusic();
    this.currentKey = key;
    if (!this.mgr.game.cache.audio.exists(key)) return; // not loaded (e.g. tests)
    this.music = this.mgr.add(key, { loop: true, volume: this.musicVolume() });
    this.music.play();
  }

  stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
    this.currentKey = undefined;
  }

  private musicVolume(): number {
    return effectiveVolume(this.settings) * MUSIC_GAIN;
  }

  private applyMusicVolume(): void {
    if (!this.music) return;
    const v = this.musicVolume();
    if (this.music.setVolume) this.music.setVolume(v);
    else this.music.volume = v;
  }

  // --- sfx -------------------------------------------------------------------

  /** Fire a one-shot sound effect (skipped while muted). */
  sfx(key: string): void {
    if (!this.mgr || this.settings.muted) return;
    if (!this.mgr.game.cache.audio.exists(key)) return;
    this.mgr.play(key, { volume: effectiveVolume(this.settings) * SFX_GAIN });
  }
}

/** Singleton — initialised once in main.ts, used by every scene. */
export const audio = new AudioManager();
