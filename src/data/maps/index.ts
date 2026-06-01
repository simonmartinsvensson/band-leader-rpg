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
import rockRoute from "./rock-route-map.json";
import rockHub from "./rock-hub-map.json";
import folkRoute from "./folk-route-map.json";
import folkHub from "./folk-hub-map.json";
import funkRoute from "./funk-route-map.json";
import funkHub from "./funk-hub-map.json";
import classicalRoute from "./classical-route-map.json";
import classicalHub from "./classical-hub-map.json";

export const MapKeys = {
  TOWN: "town",
  STREET: "street",
  STUDIO: "studio",
  JAZZ_CLUB: "jazz_club",
  VIP_LOUNGE: "vip_lounge",
  PARK: "park",
  WAREHOUSE: "warehouse",
  BACKSTAGE: "backstage",
  // Genre districts (each: <genre>_route + <genre>_hub; venue in Phase 5).
  ROCK_ROUTE: "rock_route",
  ROCK_HUB: "rock_hub",
  FOLK_ROUTE: "folk_route",
  FOLK_HUB: "folk_hub",
  FUNK_ROUTE: "funk_route",
  FUNK_HUB: "funk_hub",
  CLASSICAL_ROUTE: "classical_route",
  CLASSICAL_HUB: "classical_hub",
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
  [MapKeys.ROCK_ROUTE]: rockRoute,
  [MapKeys.ROCK_HUB]: rockHub,
  [MapKeys.FOLK_ROUTE]: folkRoute,
  [MapKeys.FOLK_HUB]: folkHub,
  [MapKeys.FUNK_ROUTE]: funkRoute,
  [MapKeys.FUNK_HUB]: funkHub,
  [MapKeys.CLASSICAL_ROUTE]: classicalRoute,
  [MapKeys.CLASSICAL_HUB]: classicalHub,
};

export function getMapData(key: string): object | undefined {
  return MAPS[key];
}
