import { findWorld } from "../content/catalog";
import { orbitTechNodes, stackGroups } from "../content/technologies";

export const makerGroups = [...stackGroups.map((group, i) => ({ label: group.label, items: orbitTechNodes.filter(tech => group.items.some(item => item[0] === tech.label) || i === 2 && !stackGroups.some(entry => entry.items.some(item => item[0] === tech.label))) })), { label: "All", items: orbitTechNodes }];
export type MakerRoute = { chapter: "tools" | "proof"; group: number; tool: typeof orbitTechNodes[number]; world: string | null };

export function readMakerRoute(query: URLSearchParams): MakerRoute | null {
  const chapter = query.get("chapter");
  if (chapter !== "tools" && chapter !== "proof") return null;
  const tool = orbitTechNodes.find(item => item.slug === query.get("tool"));
  if (chapter === "tools" && !tool) return null;
  const requested = makerGroups.findIndex(group => group.label.toLowerCase() === query.get("group"));
  const selected = tool ?? orbitTechNodes[0];
  const group = requested >= 0 && makerGroups[requested].items.includes(selected) ? requested : makerGroups.findIndex(group => group.items.includes(selected));
  return { chapter, group, tool: selected, world: findWorld(query.get("world") ?? "")?.id ?? null };
}

export function makerRouteQuery(route: MakerRoute) {
  const query = new URLSearchParams({ chapter: route.chapter });
  if (route.chapter === "tools") { query.set("tool", route.tool.slug); query.set("group", makerGroups[route.group].label.toLowerCase()); }
  if (route.world) query.set("world", route.world);
  return query;
}

export function makerRouteHref(route: MakerRoute, path = "/") {
  return `${path}?${makerRouteQuery(route)}`;
}
