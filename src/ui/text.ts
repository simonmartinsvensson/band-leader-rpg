import type Phaser from "phaser";
import { FONT_KEY } from "./font";

export interface UITextOptions {
  /** Tint color (the atlas is white, so this colors the glyphs). */
  color?: number;
  /** Word-wrap width in pixels. */
  maxWidth?: number;
  /** Origin: a single value for both axes, or { x, y }. Defaults to top-left. */
  origin?: number | { x: number; y: number };
}

/**
 * The single place all in-game UI text is created. Uses the pixel bitmap font
 * so text scales crisply, and snaps the position to whole pixels so glyphs land
 * on integer coordinates (combined with roundPixels in the game config).
 */
export function createText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: UITextOptions = {},
): Phaser.GameObjects.BitmapText {
  const bt = scene.add.bitmapText(Math.round(x), Math.round(y), FONT_KEY, text);

  if (opts.origin !== undefined) {
    if (typeof opts.origin === "number") bt.setOrigin(opts.origin);
    else bt.setOrigin(opts.origin.x, opts.origin.y);
  }
  if (opts.color !== undefined) bt.setTint(opts.color);
  if (opts.maxWidth !== undefined) bt.setMaxWidth(opts.maxWidth);

  return bt;
}
