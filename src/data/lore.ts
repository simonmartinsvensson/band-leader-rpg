// Collectible lore — notes, old records, and posters scattered across the world
// that deepen the central mystery of Cass and the old scene. A `lore` map object
// (prop `lore` = an id below) shows the entry and sets its flag the first time
// you read it; the Lore log (LoreScene) tracks what you've found. Data-driven:
// add an entry here + place a `lore` object in scripts/gen-map.mjs.

export type LoreKind = "note" | "record" | "poster";

export interface LoreEntry {
  id: string;
  kind: LoreKind;
  /** Short title shown in the Lore log. */
  title: string;
  /** Pages shown when first read (and re-readable in the world). */
  pages: string[];
  /** Story flag set once this entry is found. */
  flag: string;
}

export const LORE: LoreEntry[] = [
  {
    id: "poster_busk",
    kind: "poster",
    title: "Rain-faded MISSING poster",
    pages: ['A "MISSING" poster, rain-warped: "Have you heard this SOUND? Reward."', "It's signed, in a shaky hand: Vy."],
    flag: "lore.poster_busk",
  },
  {
    id: "note_studio",
    kind: "note",
    title: "Note under the soundboard",
    pages: ['Taped beneath the studio soundboard: "V - if the suits call again, do NOT give them my address. -C"'],
    flag: "lore.note_studio",
  },
  {
    id: "note_park",
    kind: "note",
    title: "A torn contract",
    pages: [
      "Litter on a park bench - half a contract.",
      '"MONOCORP TALENT ACQUISITION. Artist: CASS. Status: SIGNED."',
      "The date is the year the scene went quiet.",
    ],
    flag: "lore.note_park",
  },
  {
    id: "poster_strip",
    kind: "poster",
    title: "Scratched-out gig poster",
    pages: ['On the Strip: "CASS & THE STATIC - one night only, The Amp."', "The headliner's face has been scratched right off the bill."],
    flag: "lore.poster_strip",
  },
  {
    id: "record_river",
    kind: "record",
    title: "A warped 45",
    pages: ['By the river: a warped 45, label reading "Cass - Riverside Sessions."', "It still plays, barely. The voice is... warm. Human. Nothing like the radio now."],
    flag: "lore.record_river",
  },
  {
    id: "poster_block",
    kind: "poster",
    title: "Flyer, ten layers deep",
    pages: ["Posters layered ten deep on the Block.", "Peel back the Monocorp ads and there's a hand-drawn flyer for CASS, in the old scene's colours."],
    flag: "lore.poster_block",
  },
  {
    id: "record_hall",
    kind: "record",
    title: "Unlabeled archive disc",
    pages: ['Conservatory archive, a box marked "guest artists."', "One unlabeled disc holds a piece no algorithm could have written. The sleeve just says: C."],
    flag: "lore.record_hall",
  },
  {
    id: "record_vip",
    kind: "record",
    title: "An empty master reel",
    pages: ['Backstage at The Blue Note: a tape box labelled "CASS - final set."', "The reels inside are empty. Someone took the music."],
    flag: "lore.record_vip",
  },
  {
    id: "note_tower",
    kind: "note",
    title: "Monocorp internal memo",
    pages: [
      "A memo dropped in the Tower lobby:",
      '"Re: the Chairman\'s \'legacy sound\' initiative. Recommend he is never again permitted to hear the originals."',
    ],
    flag: "lore.note_tower",
  },
  // In the optional bonus areas.
  {
    id: "poster_cellar",
    kind: "poster",
    title: "Cellar wall, in marker",
    pages: ["Scrawled on the cellar wall: a list of names, most crossed out.", 'Near the bottom: "CASS - still ours. They can\'t buy a basement."'],
    flag: "lore.poster_cellar",
  },
  {
    id: "note_loft",
    kind: "note",
    title: "A pinned setlist",
    pages: ['Pinned in the rooftop loft: an old setlist in two hands.', '"V & C - opening night." Someone has written under it, recently: "we should have run."'],
    flag: "lore.note_loft",
  },
];

export function getLore(id: string): LoreEntry | undefined {
  return LORE.find((l) => l.id === id);
}
