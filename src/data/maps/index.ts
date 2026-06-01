// Map registry: Tiled map data referenced by key. Warps target maps by these
// keys (see CLAUDE.md, Maps). The overworld starts on TOWN.
import town from "./sample-map.json";
import street from "./street-map.json";
import studio from "./studio-map.json";
import jazzClub from "./jazz-club-map.json";
import vipLounge from "./vip-lounge-map.json";
import park from "./park-map.json";
import warehouse from "./warehouse-map.json";
import backstage from "./backstage-map.json";

export const MapKeys = {
  TOWN: "town",
  STREET: "street",
  STUDIO: "studio",
  JAZZ_CLUB: "jazz_club",
  VIP_LOUNGE: "vip_lounge",
  PARK: "park",
  WAREHOUSE: "warehouse",
  BACKSTAGE: "backstage",
} as const;

export const MAPS: Record<string, object> = {
  [MapKeys.TOWN]: town,
  [MapKeys.STREET]: street,
  [MapKeys.STUDIO]: studio,
  [MapKeys.JAZZ_CLUB]: jazzClub,
  [MapKeys.VIP_LOUNGE]: vipLounge,
  [MapKeys.PARK]: park,
  [MapKeys.WAREHOUSE]: warehouse,
  [MapKeys.BACKSTAGE]: backstage,
};

export function getMapData(key: string): object | undefined {
  return MAPS[key];
}
