// Data-driven NPC dialogue. A map object's `dialogue` property is an id into
// this table (see CLAUDE.md, Maps). Each dialogue is one or more pages of text;
// the DialogueScene shows them one page at a time with a typewriter effect.

export interface Dialogue {
  /** Optional speaker name shown in the box header. */
  speaker?: string;
  /** One entry per page of text. */
  pages: string[];
}

export const DIALOGUES: Record<string, Dialogue> = {
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
};

export function getDialogue(id: string): Dialogue | undefined {
  return DIALOGUES[id];
}
