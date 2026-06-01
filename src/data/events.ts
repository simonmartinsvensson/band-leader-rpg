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
];
