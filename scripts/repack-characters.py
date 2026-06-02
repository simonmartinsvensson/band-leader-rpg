#!/usr/bin/env python3
"""Repack LimeZu "Modern Interiors (free)" character sheets into the game's
overworld-character format.

Source (raw pack, gitignored, NOT redistributed — non-commercial license):
    assets-src/limezu/Characters_free/<Name>_idle_16x16.png   (64x32  = 4 frames of 16x32)
    assets-src/limezu/Characters_free/<Name>_run_16x16.png    (384x32 = 24 frames of 16x32)

LimeZu frames are 16 wide x 32 tall (one tile wide, two tall — the character
stands on its bottom 16x16 tile and its head overhangs the tile above). Both the
idle and run sheets order their frames by facing direction: down, up, left, right.
The run sheet is 4 directions x a 6-frame walk cycle.

Output (served, committed — these are the only files the game loads):
    public/assets/char_<name>.png   112x128 spritesheet of 16x32 frames, laid out
    7 columns x 4 rows. Row = direction (down, up, left, right). In each row,
    column 0 is the idle/standing frame and columns 1..6 are the walk cycle. So
    Phaser frame index = row*7 + col:
        down : idle 0,  walk 1..6
        up   : idle 7,  walk 8..13
        left : idle 14, walk 15..20
        right: idle 21, walk 22..27
    This layout is mirrored in src/ui/characterAnims.ts — change one, change both.

Run with:  npm run gen:characters   (or: python3 scripts/repack-characters.py)
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets-src", "limezu", "Characters_free")
OUT = os.path.join(ROOT, "public", "assets")

FRAME_W, FRAME_H = 16, 32
COLS = 7  # idle + 6 walk frames per direction row
ROWS = 4  # down, up, left, right
DIRECTIONS = ["down", "up", "left", "right"]
WALK_LEN = 6

# LimeZu character name -> output key suffix (lowercase). Adam is the player.
CHARACTERS = {"Adam": "adam", "Alex": "alex", "Amelia": "amelia", "Bob": "bob"}


def load(name, suffix):
    path = os.path.join(SRC, f"{name}_{suffix}_16x16.png")
    if not os.path.isfile(path):
        sys.exit(f"ERROR: missing source sheet {path}\n"
                 f"Point SRC at your unzipped LimeZu Characters_free folder.")
    return Image.open(path).convert("RGBA")


def repack(name, key):
    idle = load(name, "idle")  # 64x32  -> 4 frames (down, up, left, right)
    run = load(name, "run")    # 384x32 -> 24 frames (4 dirs x 6 walk)
    out = Image.new("RGBA", (COLS * FRAME_W, ROWS * FRAME_H), (0, 0, 0, 0))

    for d, _ in enumerate(DIRECTIONS):
        # Column 0: the clean standing frame for this direction.
        stand = idle.crop((d * FRAME_W, 0, d * FRAME_W + FRAME_W, FRAME_H))
        out.paste(stand, (0, d * FRAME_H), stand)
        # Columns 1..6: this direction's 6-frame walk cycle from the run sheet.
        for w in range(WALK_LEN):
            sx = (d * WALK_LEN + w) * FRAME_W
            frame = run.crop((sx, 0, sx + FRAME_W, FRAME_H))
            out.paste(frame, ((1 + w) * FRAME_W, d * FRAME_H), frame)

    dest = os.path.join(OUT, f"char_{key}.png")
    out.save(dest)
    print(f"wrote {os.path.relpath(dest, ROOT)} ({out.width}x{out.height})")


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, key in CHARACTERS.items():
        repack(name, key)
    print(f"Repacked {len(CHARACTERS)} characters into {os.path.relpath(OUT, ROOT)}.")


if __name__ == "__main__":
    main()
