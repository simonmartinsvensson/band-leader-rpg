import type { StoryEvent } from "../types/event";

/**
 * Scripted events ("cutscenes"), keyed by trigger + gated by story flags. The
 * engine (src/systems/cutscene.ts + the overworld) fires the first eligible
 * event whose trigger matches. No story content yet — add events here, e.g.:
 *
 *   {
 *     id: "intro_meet_rival",
 *     trigger: { type: "enterTile", map: "town", x: 5, y: 8 },
 *     once: "story.met_rival",            // set when done; never replays
 *     steps: [
 *       { kind: "turn", actor: "player", facing: "left" },
 *       { kind: "dialogue", speaker: "Rival Max", pages: ["We meet at last."] },
 *       { kind: "walk", actor: "rival_max", path: ["down", "down"] },
 *       { kind: "setFlag", flag: "story.tutorial_done" },
 *       { kind: "giveItem", item: "demo_tape", qty: 1 },
 *     ],
 *   }
 *
 * See CLAUDE.md "Story, flags & scripted events" for the full step/trigger set.
 */
export const EVENTS: StoryEvent[] = [
  // --- The opening: name entry, motivation, the starter band, and the first
  // hints of Monocorp + the vanished legend. Fires once, on a fresh game.
  {
    id: "intro",
    trigger: { type: "enterMap", map: "town" },
    once: "story.intro_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "You made it. I'm Vy - I produce the acts nobody else will touch.",
          "You came a long way to play this city. Most leaders are running the other direction lately.",
        ],
      },
      { kind: "nameEntry", prompt: "What's your name, leader?", default: "Newcomer" },
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "{name}, huh. That'll look good on a marquee.",
          "So why come HERE, of all the dying scenes? ...The noise, right. You miss the noise. So do I.",
        ],
      },
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "Every leader needs a band. Here - a Rifflet and a Crooner. Look after them.",
          "Recruit players, train them up, and win a residency at every venue. That's how you build a name.",
        ],
      },
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "It's quiet out there because of MONOCORP. They bought up the stages and now every act sounds the same.",
          "...Reminds me of someone I led a band with, years back. Best ear I ever knew. Then one night - gone. No note, no trace.",
          "Anyway. Cut your teeth in town, then chase a residency at The Blue Note. Go make some noise, {name}.",
        ],
      },
      { kind: "setFlag", flag: "story.intro_done" },
    ],
  },

  // --- Beat 1: the rival blocks the way and challenges you (a real battle).
  {
    id: "beat_rival",
    trigger: { type: "interact", object: "rival_max" },
    requires: ["story.intro_done"],
    once: "story.met_rival",
    steps: [
      {
        kind: "dialogue",
        speaker: "Rival Max",
        pages: [
          "Another nobody chasing a dead scene? Cute.",
          "Monocorp already owns every stage worth playing. Prove you even belong here, {name}.",
        ],
      },
      { kind: "battle", trainer: "rival_max" },
      {
        kind: "dialogue",
        speaker: "Rival Max",
        pages: [
          "...Tch. Maybe you've got a sound after all.",
          "Watch yourself. Monocorp's reps are already crawling all over town.",
        ],
      },
      { kind: "setFlag", flag: "story.met_rival" },
    ],
  },

  // --- Beat 2: a Monocorp rep makes the homogenizing pitch; you refuse.
  {
    id: "beat_monocorp",
    trigger: { type: "interact", object: "monocorp_agent" },
    requires: ["story.met_rival"],
    once: "story.saw_monocorp",
    steps: [
      {
        kind: "dialogue",
        speaker: "Monocorp Rep",
        pages: [
          "A new leader! Wonderful. Have you considered... consistency?",
          "One sound. One brand. Sign with Monocorp and we'll smooth out those rough edges of yours.",
          "The city doesn't need NOISE. It needs product.",
        ],
      },
      { kind: "dialogue", speaker: "{name}", pages: ["...Hard pass."] },
      {
        kind: "dialogue",
        speaker: "Monocorp Rep",
        pages: ["Everyone says that. At first.", "We'll be seeing you around, {name}."],
      },
      { kind: "setFlag", flag: "story.saw_monocorp" },
    ],
  },

  // --- Beat 3: Vy's warning ties Monocorp to the vanished legend, and points
  // you at the first venue.
  {
    id: "beat_mentor_warning",
    trigger: { type: "interact", object: "mentor" },
    requires: ["story.saw_monocorp"],
    once: "story.mentor_warning",
    steps: [
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "So you met Monocorp. They'll come at you harder now that you said no.",
          "That leader I mentioned - the one who vanished? They were the last act to really stand up to a label like this.",
          "I've always wondered if Monocorp had something to do with it.",
        ],
      },
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "Win The Blue Note, {name}. A residency is a stage they can't buy out from under you.",
          "That's how we start taking the scene back. Now go - your first gig's waiting.",
        ],
      },
      { kind: "setFlag", flag: "story.mentor_warning" },
    ],
  },

  // === VY'S ARC — recurring scenes at the mentor in town that gradually reveal
  // the vanished legend (Cass) and Vy's guilt, paying off the finale. Chained on
  // the previous scene + a circuit milestone. ===

  // After the first venue — the legend gets a name.
  {
    id: "vy_arc_2",
    trigger: { type: "interact", object: "mentor" },
    requires: ["story.mentor_warning", "story.jazz_won"],
    once: "story.vy2_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "You took The Blue Note! Cass would've loved that room.",
          "...That's the name. Cass. We co-led a band, once, back when the scene was deafening.",
          "Best ear I ever knew. Then the labels came sniffing, and one night Cass was just - gone.",
        ],
      },
      { kind: "setFlag", flag: "story.vy2_done" },
    ],
  },

  // After the second venue — Vy's guilt surfaces.
  {
    id: "vy_arc_3",
    trigger: { type: "interact", object: "mentor" },
    requires: ["story.vy2_done", "story.electronic_won"],
    once: "story.vy3_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "Two residencies. You're doing what Cass and I never finished. I have to tell you something, {name}.",
          "When the suits courted us, I'm the one who told them where to find Cass. I thought it was our big break.",
          "I handed them the best of us. I've carried that a long time.",
        ],
      },
      { kind: "setFlag", flag: "story.vy3_done" },
    ],
  },

  // After the last district venue — the confession + the push to the Tower.
  {
    id: "vy_arc_4",
    trigger: { type: "interact", object: "mentor" },
    requires: ["story.vy3_done", "story.classical_won"],
    once: "story.vy4_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "Every scene in the city, {name}. Every stage. You actually did it.",
          "I never believed Cass 'vanished'. People don't vanish - they go quiet. They get bought. They forget their own sound.",
          "Monocorp Tower, top floor. If Cass is anywhere left to find... go. Bring them home, or end what they built. Finish it.",
        ],
      },
      { kind: "setFlag", flag: "story.vy4_done" },
    ],
  },

  // === THE RIVAL ARC — Max, across the circuit. Each beat is gated on the
  // previous (chaining the arc) and lives in a different district hub (so he
  // "appears across the circuit"), ending back in town. Relationship state is
  // the set of story.rivalN_done flags (+ rival_signed / rival_redeemed). ===

  // Beat 2 (Rock Strip) — cocky, but Monocorp's noticed him too.
  {
    id: "beat_rival2",
    trigger: { type: "interact", object: "rival_rock" },
    requires: ["story.met_rival"],
    once: "story.rival2_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Rival Max",
        pages: [
          "{name}! Heard you took The Blue Note. Don't look so smug.",
          "Monocorp scouts clocked me at the Strip too, y'know. Maybe I'll hear them out. Maybe I won't.",
          "First - remind me why I should bother. Go!",
        ],
      },
      { kind: "battle", trainer: "rival_max_2" },
      {
        kind: "dialogue",
        speaker: "Rival Max",
        pages: ["Lucky. Whatever - some of us have OFFERS to think about.", "See you down the circuit."],
      },
      { kind: "setFlag", flag: "story.rival2_done" },
    ],
  },

  // Beat 3 (Funk Block) — tempted. Monocorp's made the offer.
  {
    id: "beat_rival3",
    trigger: { type: "interact", object: "rival_funk" },
    requires: ["story.rival2_done"],
    once: "story.rival3_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Rival Max",
        pages: [
          "They made the offer, {name}. Real money. A real budget. Tour buses.",
          "Like this new sound? Monocorp helped me 'refine' it. Slicker, right?",
          "You'd be a fool to say no. Let me show you what the budget buys.",
        ],
      },
      { kind: "battle", trainer: "rival_max_3" },
      {
        kind: "dialogue",
        speaker: "Rival Max",
        pages: ["...tch. The money's real even if your little scene isn't.", "I'm taking the deal."],
      },
      { kind: "setFlag", flag: "story.rival3_done" },
    ],
  },

  // Beat 4 (Classical Hall) — signed. The sound is gone; so is he.
  {
    id: "beat_rival4",
    trigger: { type: "interact", object: "rival_classical" },
    requires: ["story.rival3_done"],
    once: "story.rival4_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Max [Monocorp]",
        pages: [
          "It's official now, {name}. See the badge?",
          "One brand. One sound. It's... efficient. Optimized. The numbers love me.",
          "Stop looking at me like that and BATTLE.",
        ],
      },
      { kind: "battle", trainer: "rival_max_4" },
      {
        kind: "dialogue",
        speaker: "Max [Monocorp]",
        pages: ["...why doesn't winning feel like anything anymore?", "Just- just go, {name}. Leave me alone."],
      },
      { kind: "setFlag", flag: "story.rival4_done" },
      { kind: "setFlag", flag: "story.rival_signed" },
    ],
  },

  // Beat 5 (back in town) — he quits Monocorp; one honest battle; redemption.
  // Foreshadows the Chairman (who made the same trade and never came back).
  {
    id: "beat_rival5",
    trigger: { type: "interact", object: "rival_max" },
    requires: ["story.rival4_done", "story.classical_won"],
    once: "story.rival5_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Max",
        pages: [
          "Caught you before the Tower. Good. ...I quit them, {name}.",
          "Couldn't make their sound one more night. It wasn't mine. It wasn't ANYTHING.",
          "One last battle. No Monocorp tricks - just me. Remind me what I sound like.",
        ],
      },
      { kind: "battle", trainer: "rival_max_5" },
      {
        kind: "dialogue",
        speaker: "Max",
        pages: [
          "...Yeah. THAT'S it. The sound I almost traded away forever.",
          "Whoever's at the top of that Tower? They made the same trade I almost did - and they never found their way back.",
          "Go remind THEM too. Loud as you can.",
        ],
      },
      { kind: "setFlag", flag: "story.rival5_done" },
      { kind: "setFlag", flag: "story.rival_redeemed" },
    ],
  },

  // === THE WORLD REACTS — repeatable flavour beats (no `once`, no flags set)
  // that change an NPC's lines as the story advances. findEvent picks the first
  // eligible event, falling back to the NPC's base dialogue; reactive events are
  // kept mutually exclusive (requires/forbids) so order doesn't matter. ===

  // District locals cheer once you've won their venue.
  {
    id: "react_rock_local",
    trigger: { type: "interact", object: "rock_local" },
    requires: ["story.rock_won"],
    steps: [
      {
        kind: "dialogue",
        speaker: "Strip Regular",
        pages: ["The Amp's PACKED again - heard it three blocks over!", "You did that, {name}. The Strip's LOUD."],
      },
    ],
  },
  {
    id: "react_folk_local",
    trigger: { type: "interact", object: "folk_local" },
    requires: ["story.folk_won"],
    steps: [
      {
        kind: "dialogue",
        speaker: "Riverside Busker",
        pages: ["They're singing your set on the water now, {name}.", "The Landing's full every night. Folk's home again."],
      },
    ],
  },
  {
    id: "react_funk_local",
    trigger: { type: "interact", object: "funk_local" },
    requires: ["story.funk_won"],
    steps: [
      {
        kind: "dialogue",
        speaker: "Block Captain",
        pages: ["The Pocket's been JUMPIN' since you played it, {name}.", "Whole block's back on the one. Feel that?"],
      },
    ],
  },
  {
    id: "react_classical_local",
    trigger: { type: "interact", object: "classical_local" },
    requires: ["story.classical_won"],
    steps: [
      {
        kind: "dialogue",
        speaker: "Hall Usher",
        pages: ["The Conservatory has not sounded so alive in years.", "Mastery AND fire, {name}. The maestro approves of you."],
      },
    ],
  },

  // The town busker tracks the rival's slide and redemption (surfaces the rival
  // relationship state out in the world). Ordered most-progressed first.
  {
    id: "react_busker_postgame",
    trigger: { type: "interact", object: "busker" },
    requires: ["story.game_complete"],
    steps: [
      {
        kind: "dialogue",
        speaker: "Street Busker",
        pages: ["Listen to it. The whole city, loud again.", "We owe you the noise, {name}. Spare a chord? Heh - on the house."],
      },
    ],
  },
  {
    id: "react_busker_redeemed",
    trigger: { type: "interact", object: "busker" },
    requires: ["story.rival_redeemed"],
    forbids: ["story.game_complete"],
    steps: [
      {
        kind: "dialogue",
        speaker: "Street Busker",
        pages: ["Max tore that Monocorp badge clean off, you hear?!", "Word is YOU got in his head, {name}. Ha! Good."],
      },
    ],
  },
  {
    id: "react_busker_signed",
    trigger: { type: "interact", object: "busker" },
    requires: ["story.rival_signed"],
    forbids: ["story.rival_redeemed"],
    steps: [
      {
        kind: "dialogue",
        speaker: "Street Busker",
        pages: ["You hear Max signed with Monocorp? Tch.", "Kid had a REAL sound, too. They'll sand it right off him. Shame."],
      },
    ],
  },

  // === SIDEQUESTS — small, self-contained NPC stories with a reward on
  // completion (give -> condition -> reward), driven entirely by interact events
  // + flags. Each NPC has a base/idle dialogue (src/data/dialogues.ts) as the
  // fallback between/after beats. ===

  // SQ1 "The Lost Record" — find a Cass 45 (ties into the lore collectible).
  {
    id: "sq1_give",
    trigger: { type: "interact", object: "sq_collector" },
    once: "story.sq1_started",
    steps: [
      {
        kind: "dialogue",
        speaker: "Record Collector",
        pages: [
          "You've got good ears, I can tell. Do me a favour, {name}?",
          "I lost my favourite 45 down by the river - 'Cass: Riverside Sessions.'",
          "If you find it survived, come tell me. I'll make it worth your while.",
        ],
      },
      { kind: "setFlag", flag: "story.sq1_started" },
    ],
  },
  {
    id: "sq1_done",
    trigger: { type: "interact", object: "sq_collector" },
    requires: ["story.sq1_started", "lore.record_river"],
    once: "story.sq1_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Record Collector",
        pages: ["You heard it?! It still PLAYS? That warm old sound...", "Thank you, {name}. Take these - and a little something for the trouble."],
      },
      { kind: "giveItem", item: "demo_tape", qty: 2 },
      { kind: "giveCurrency", amount: 600 },
      { kind: "setFlag", flag: "story.sq1_done" },
    ],
  },
  {
    id: "sq1_thanks",
    trigger: { type: "interact", object: "sq_collector" },
    requires: ["story.sq1_done"],
    steps: [{ kind: "dialogue", speaker: "Record Collector", pages: ["Keep that old sound alive out there, {name}."] }],
  },

  // SQ2 "Prove It" — a one-shot battle challenge in the park.
  {
    id: "sq2_challenge",
    trigger: { type: "interact", object: "sq_ringer_npc" },
    once: "story.sq2_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Park Ringer",
        pages: ["Think you've got a sound, newcomer? I'm the best busker in this park.", "Beat me and my lucky pick is yours. Let's go!"],
      },
      { kind: "battle", trainer: "sq_ringer" },
      { kind: "dialogue", speaker: "Park Ringer", pages: ["...alright, alright! You've got it, {name}.", "Here - my lucky pick. Plays sweeter than it has any right to."] },
      { kind: "giveItem", item: "hype_track", qty: 1 },
      { kind: "giveCurrency", amount: 500 },
      { kind: "setFlag", flag: "story.sq2_done" },
    ],
  },
  {
    id: "sq2_thanks",
    trigger: { type: "interact", object: "sq_ringer_npc" },
    requires: ["story.sq2_done"],
    steps: [{ kind: "dialogue", speaker: "Park Ringer", pages: ["Still the best in the park - after you, {name}. Heh."] }],
  },

  // SQ3 "Mixtape Delivery" — carry a mixtape from downtown to the Riverside.
  {
    id: "sq3_give",
    trigger: { type: "interact", object: "sq_sender" },
    once: "story.sq3_started",
    steps: [
      {
        kind: "dialogue",
        speaker: "Mixtape Kid",
        pages: ["Hey, you look like you get around. Take this mixtape to my friend on the Riverside?", "They've been down lately. This'll lift them right up."],
      },
      { kind: "setFlag", flag: "story.sq3_started" },
    ],
  },
  {
    id: "sq3_done",
    trigger: { type: "interact", object: "sq_recipient" },
    requires: ["story.sq3_started"],
    once: "story.sq3_done",
    steps: [
      {
        kind: "dialogue",
        speaker: "Riverside Friend",
        pages: ["A mixtape? All the way out here, for me? ...Oh, this is beautiful.", "Tell them thank you, {name}. And take this for the road - you've earned it."],
      },
      { kind: "giveItem", item: "energy_drink", qty: 2 },
      { kind: "giveCurrency", amount: 400 },
      { kind: "setFlag", flag: "story.sq3_done" },
    ],
  },
  {
    id: "sq3_recipient_thanks",
    trigger: { type: "interact", object: "sq_recipient" },
    requires: ["story.sq3_done"],
    steps: [{ kind: "dialogue", speaker: "Riverside Friend", pages: ["That mixtape's been on repeat by the water. Thank your friend again!"] }],
  },

  // --- THE FINALE: Monocorp's headliner gauntlet (Elite-Four style) ---
  // Triggered by facing The Chairman atop Monocorp Tower, once every residency
  // is earned. Four boss battles back-to-back (the cutscene chains them, so the
  // party is NOT healed between fights), then the legend reveal + the win state.
  {
    id: "finale_gauntlet",
    trigger: { type: "interact", object: "monocorp_ceo" },
    requires: [
      "story.jazz_won",
      "story.electronic_won",
      "story.rock_won",
      "story.folk_won",
      "story.funk_won",
      "story.classical_won",
    ],
    once: "story.game_complete",
    steps: [
      {
        kind: "dialogue",
        speaker: "The Chairman",
        pages: [
          "You cleared every stage in my city. A residency in each. Loud.",
          "But the top floor is mine. My headliners will make sure you never reach it.",
          "No intermissions, {name}. No breather. Let's see what your band is really made of.",
        ],
      },
      { kind: "battle", trainer: "monocorp_enforcer" },
      { kind: "battle", trainer: "monocorp_curator" },
      { kind: "battle", trainer: "monocorp_exec" },
      {
        kind: "dialogue",
        speaker: "The Chairman",
        pages: [
          "Far enough. Sit. Listen.",
          "Vy still says the name like a prayer, don't they? Cass. Yes - I was Cass. The leader they idolized.",
          "I didn't vanish, {name}. I WON. I gave this city one perfect, safe, profitable sound - and it stopped fighting.",
          "Let me give you the same peace.",
        ],
      },
      { kind: "battle", trainer: "monocorp_ceo" },
      {
        kind: "dialogue",
        speaker: "The Chairman",
        pages: [
          "...That sound. I used to make that sound. Before I traded it for quiet.",
          "Go on. Take it all back. The scene was never mine to sell.",
        ],
      },
      {
        kind: "dialogue",
        speaker: "Vy the Producer",
        pages: [
          "I felt that downtown. The whole block looked UP from their phones.",
          "You found them, {name}. You found the one who vanished - and you brought the noise home.",
        ],
      },
      { kind: "setFlag", flag: "story.game_complete" },
      { kind: "win" },
    ],
  },
];
