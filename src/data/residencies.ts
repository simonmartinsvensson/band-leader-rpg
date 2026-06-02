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
  electronic: { id: "electronic", name: "Warehouse Residency", venue: "The Warehouse" },
  rock: { id: "rock", name: "Amp Residency", venue: "The Amp" },
  folk: { id: "folk", name: "Landing Residency", venue: "The Landing" },
};

export function getResidency(id: string): Residency | undefined {
  return RESIDENCIES[id];
}
