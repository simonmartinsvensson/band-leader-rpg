#!/usr/bin/env python3
"""Slice LimeZu "Modern Interiors (free)" interior tiles into the game's interior
tileset, used to retexture the INTERIOR maps (venues, shops, the studio, the VIP
lounge, the backstage, the Cellar, the Loft, the Tower lobby). Outdoor maps stay
on the generated placeholder `tileset.png`.

Source (raw pack, gitignored, NOT redistributed — non-commercial license):
    assets-src/limezu/Interiors_free/16x16/Room_Builder_free_16x16.png  (floors + wall panels)
    assets-src/limezu/Interiors_free/16x16/Interiors_free_16x16.png      (furniture / decor)

Output (served, committed — the only interior-tile file the game loads):
    public/assets/tileset_interior.png

The output is a curated 8-column atlas of hand-picked 16x16 tiles. The GID a map
references is (atlas index + 1) — firstgid is 1 — so the index order below IS the
contract. It is mirrored in:
    * src/data/assets.ts        (InteriorTile enum + TILESET_TEXTURES registry)
    * scripts/gen-map.mjs       (the `IT` GID constants used to author interiors)
Change the order here, change it in both of those. To swap in different art,
keep the same atlas slots (same index -> same meaning) and re-run this script.

Run with:  npm run gen:tiles-interior   (or: python3 scripts/gen-tiles-interior.py)
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets-src", "limezu", "Interiors_free", "16x16")
OUT = os.path.join(ROOT, "public", "assets", "tileset_interior.png")
CELL = 16
COLS = 8  # atlas width in tiles (matches src/data/assets.ts / gen-map.mjs)

# Curated tiles, in GID order (GID = index + 1). Each entry is
# (source-atlas, column, row) in 16x16 tile units. RB = Room_Builder (floors +
# wall panels), IN = Interiors (furniture/decor). The names are documentation;
# the ORDER is what matters (it defines the GIDs the maps use).
RB = "Room_Builder_free_16x16.png"
IN = "Interiors_free_16x16.png"
TILES = [
    # --- floors (index 0-5; walkable in maps) ---
    ("floor_wood", RB, 11, 13),      # 0 -> GID 1: warm herringbone wood
    ("floor_brick", RB, 11, 5),      # 1 -> GID 2: red brick
    ("floor_concrete", RB, 11, 11),  # 2 -> GID 3: plain gray concrete
    ("floor_cream", RB, 11, 7),      # 3 -> GID 4: cream patterned tile
    ("floor_teal", RB, 11, 9),       # 4 -> GID 5: teal patterned tile
    ("floor_marble", RB, 14, 11),    # 5 -> GID 6: light gray polished
    # --- walls (index 6-10; blocking border in maps) ---
    ("wall_wood", RB, 0, 14),        # 6 -> GID 7: vertical wood planks
    ("wall_blue", RB, 0, 18),        # 7 -> GID 8: blue-gray planks
    ("wall_tan", RB, 0, 20),         # 8 -> GID 9: tan planks
    ("wall_peach", RB, 0, 6),        # 9 -> GID 10: warm peach panel
    ("wall_mint", RB, 0, 10),        # 10 -> GID 11: mint panel
    # --- decor (index 11-17; non-blocking on floor, OR on the wall border) ---
    ("rug", IN, 12, 16),             # 11 -> GID 12: patterned area rug (floor)
    ("spotlight", IN, 8, 21),        # 12 -> GID 13: glowing stage mat (floor)
    ("plant", IN, 0, 49),            # 13 -> GID 14: potted plant (wall row)
    ("shelf", IN, 10, 72),           # 14 -> GID 15: stocked bottle shelf (wall row)
    ("sofa", IN, 2, 44),             # 15 -> GID 16: plush sofa (wall row)
    ("art", IN, 2, 71),              # 16 -> GID 17: framed art (wall row)
    ("fire", IN, 4, 69),             # 17 -> GID 18: fireplace hearth (wall row)
]


def main():
    sheets = {}
    for _name, atlas, _c, _r in TILES:
        if atlas not in sheets:
            sheets[atlas] = Image.open(os.path.join(SRC, atlas)).convert("RGBA")

    rows = (len(TILES) + COLS - 1) // COLS
    out = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    for i, (_name, atlas, cx, cy) in enumerate(TILES):
        src = sheets[atlas]
        tile = src.crop((cx * CELL, cy * CELL, cx * CELL + CELL, cy * CELL + CELL))
        gx, gy = (i % COLS) * CELL, (i // COLS) * CELL
        out.paste(tile, (gx, gy))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out.save(OUT)
    print(f"Wrote {OUT} ({out.width}x{out.height}, {len(TILES)} tiles, {COLS} cols x {rows} rows)")


if __name__ == "__main__":
    main()
