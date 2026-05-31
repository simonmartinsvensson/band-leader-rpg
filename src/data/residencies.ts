// Residencies are the "badge" equivalent — earned by beating a venue's
// headliner. Tracked in player state (registry "residencies").

export interface Residency {
  id: string;
  name: string;
  /** The venue that grants it. */
  venue: string;
}

export const RESIDENCIES: Record<string, Residency> = {
  jazz: { id: "jazz", name: "Jazz Residency", venue: "The Blue Note" },
};

export function getResidency(id: string): Residency | undefined {
  return RESIDENCIES[id];
}
