// Data-driven NPC dialogue. A map object's `dialogue` property is an id into
// this table (see CLAUDE.md, Maps). Each dialogue is one or more pages of text;
// the DialogueScene shows them one page at a time with a typewriter effect.

/** A one-time (or repeatable) gift an NPC grants when talked to. */
export interface DialogueGift {
  items?: Array<{ id: string; qty: number }>;
  currency?: number;
  /** If set, the gift is granted only once (tracked by this flag id). */
  once?: string;
}

export interface Dialogue {
  /** Optional speaker name shown in the box header. */
  speaker?: string;
  /** One entry per page of text. */
  pages: string[];
  /** Items / currency this NPC gives when talked to. */
  gift?: DialogueGift;
  /** If set, talking opens a shop selling these item ids. */
  shop?: string[];
}

export const DIALOGUES: Record<string, Dialogue> = {
  intro: {
    speaker: "Vy the Producer",
    pages: [
      "Welcome to the scene! I'm Vy - I produce the up-and-comers.",
      "Every leader needs a band. Here are your first two: a Rifflet and a Crooner. Look after them.",
      "Your goal: recruit musicians, train them up, and win a residency at every venue.",
      "The busking street is south of here. Go make some noise!",
    ],
  },
  mentor: {
    speaker: "Vy the Producer",
    pages: [
      "So you want to lead a band? First lesson: great bands are built one musician at a time.",
      "Every player has a GENRE and knows a few TECHNIQUES. Learn what each one brings to the stage.",
      "Find talent, win them over at AUDITIONS, then prove your crew at the VENUES. Now go - your first act is waiting!",
    ],
  },
  busker: {
    speaker: "Street Busker",
    pages: [
      "Spare a chord? Heh. I just busk out here for the open air and the spare change.",
      "Word is a producer's been scouting newcomers. Could be your big break, kid.",
    ],
  },
  roadie: {
    speaker: "Roadie",
    pages: [
      "New band on the scene? Here, take some supplies.",
      "Got you a couple Snacks, an Energy Drink, and some cash. Go make some noise!",
    ],
    gift: {
      items: [
        { id: "snack", qty: 2 },
        { id: "energy_drink", qty: 1 },
      ],
      currency: 200,
      once: "roadie_gift",
    },
  },
  shopkeeper: {
    speaker: "Shopkeeper",
    pages: ["Welcome to the Gear Shop!"],
    shop: ["snack", "energy_drink", "demo_tape", "hype_track"],
  },
  vip_host: {
    speaker: "VIP Host",
    pages: [
      "You made it backstage at The Blue Note! Word of your residency is spreading fast.",
      "They say if you linger back here, you can still catch Cass's old sound in the room.",
      "A few leaders have even coaxed it into the band. Keep your ears open, {name}.",
    ],
  },
  rival_after: {
    speaker: "Rival Max",
    pages: ["Go on, chase your residency.", "I'll be watching, {name}. Don't let Monocorp flatten that sound of yours."],
  },
  monocorp_after: {
    speaker: "Monocorp Rep",
    pages: ["The offer stands. It always stands.", "Enjoy the noise while it lasts."],
  },
  // Shared gear stall used by every district hub's shop.
  gear_stall: {
    speaker: "Gear Stall",
    pages: ["Stocking up, {name}? Smart."],
    shop: ["snack", "energy_drink", "demo_tape", "hype_track"],
  },
  // --- District locals + future-venue signs (Phase 5 builds the venues) ---
  rock_local: {
    speaker: "Strip Regular",
    pages: [
      "Welcome to the Strip, {name}. Loudest blocks in the city - or they used to be.",
      "Half these dives went quiet when Monocorp came through. Bring the volume back, yeah?",
    ],
  },
  rock_venue_sign: {
    speaker: "Sign",
    pages: ['"THE AMP - dive-bar showcase."', "Stage is still being wired. Soundcheck soon."],
  },
  folk_local: {
    speaker: "Riverside Busker",
    pages: [
      "The river carries every tune out here, {name}. Folk never really left.",
      "A good ballad cuts through anything - even a label's noise.",
    ],
  },
  folk_venue_sign: {
    speaker: "Sign",
    pages: ['"THE LANDING - riverside open mic."', "Opening its doors before long."],
  },
  funk_local: {
    speaker: "Block Captain",
    pages: [
      "The Block runs on the one, {name}. You feel that pocket? Monocorp can't bottle it.",
      "Lock a tight groove down here and nobody's standing still.",
    ],
  },
  funk_venue_sign: {
    speaker: "Sign",
    pages: ['"THE POCKET - soul & funk hall."', "Crew's still laying the dance floor. Soon."],
  },
  classical_local: {
    speaker: "Hall Usher",
    pages: [
      "Welcome to the Hall, {name}. Precision and patience - the old disciplines.",
      "Monocorp calls it outdated. We call it the foundation everything else stands on.",
    ],
  },
  classical_venue_sign: {
    speaker: "Sign",
    pages: ['"THE CONSERVATORY - concert hall."', "Tuning the room. Doors open in due time."],
  },
  // Monocorp Tower (the finale location).
  tower_guard: {
    speaker: "Tower Lobby",
    pages: [
      "Monocorp Tower. Every playlist in the city is mixed on the top floor.",
      "The Chairman only sees leaders who've made a name in every scene.",
    ],
  },
  // Shown when you face The Chairman before earning all six residencies.
  monocorp_ceo_locked: {
    speaker: "The Chairman",
    pages: [
      "Come back when you matter, {name}.",
      "Win a residency in every scene in my city. Then we'll talk about the top floor.",
    ],
  },
  park_scout: {
    speaker: "Talent Scout",
    pages: [
      "The riverside park's where the real players warm up. Stronger acts than the street, too.",
      "Heading for The Warehouse? Those synth-heads run hot. A tight FUNK or CLASSICAL player cuts right through electronic.",
      "There's a Funkadel and a Sonatina around here somewhere. Just saying.",
    ],
  },
  backstage_host: {
    speaker: "Stage Manager",
    pages: [
      "Two residencies?! The whole circuit's talking about your band.",
      "Take a breather backstage. You earned the warehouse floor.",
    ],
    gift: {
      items: [{ id: "demo_tape", qty: 2 }],
      currency: 500,
      once: "warehouse_backstage_gift",
    },
  },
};

export function getDialogue(id: string): Dialogue | undefined {
  return DIALOGUES[id];
}
