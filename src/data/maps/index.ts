// Map registry: Tiled map data referenced by key. Warps target maps by these
// keys (see CLAUDE.md, Maps). The overworld starts on TOWN.
import town from "./sample-map.json";
import street from "./street-map.json";
import studio from "./studio-map.json";

export const MapKeys = {
  TOWN: "town",
  STREET: "street",
  STUDIO: "studio",
} as const;

export const MAPS: Record<string, object> = {
  [MapKeys.TOWN]: town,
  [MapKeys.STREET]: street,
  [MapKeys.STUDIO]: studio,
};

export function getMapData(key: string): object | undefined {
  return MAPS[key];
}
