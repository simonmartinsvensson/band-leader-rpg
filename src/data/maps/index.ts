// Map registry: Tiled map data referenced by key. Warps target maps by these
// keys (see CLAUDE.md, Maps). The overworld starts on TOWN.
import town from "./sample-map.json";
import street from "./street-map.json";

export const MapKeys = {
  TOWN: "town",
  STREET: "street",
} as const;

export const MAPS: Record<string, object> = {
  [MapKeys.TOWN]: town,
  [MapKeys.STREET]: street,
};

export function getMapData(key: string): object | undefined {
  return MAPS[key];
}
