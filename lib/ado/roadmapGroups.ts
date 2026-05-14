import type { RoadmapRow } from "./report";

function areaItemUnderSelectedRoot(itemAreaPath: string, selectedRoot: string): boolean {
  const item = itemAreaPath.trim();
  const root = selectedRoot.trim();
  if (!root) return false;
  if (!item) return false;
  if (item === root) return true;
  return item.startsWith(`${root}\\`);
}

/** Agrupa o roadmap: uma secção por Area Path do filtro; cada item só num grupo (ordem das seleções). */
export function groupRoadmapBySelectedAreas(
  roadmap: RoadmapRow[],
  selectedAreaPaths: string[],
): { areaPath: string; rows: RoadmapRow[] }[] {
  const usedIds = new Set<number>();
  const groups: { areaPath: string; rows: RoadmapRow[] }[] = [];

  for (const sel of selectedAreaPaths) {
    const rows = roadmap
      .filter((r) => {
        if (usedIds.has(r.id)) return false;
        if (!areaItemUnderSelectedRoot(r.areaPath, sel)) return false;
        usedIds.add(r.id);
        return true;
      })
      .sort((a, b) => a.id - b.id);
    groups.push({ areaPath: sel, rows });
  }

  const leftovers = roadmap.filter((r) => !usedIds.has(r.id));
  if (leftovers.length > 0) {
    const byPath = new Map<string, RoadmapRow[]>();
    for (const r of leftovers) {
      const key = r.areaPath.trim() || "(sem Area Path)";
      const arr = byPath.get(key) ?? [];
      arr.push(r);
      byPath.set(key, arr);
    }
    for (const [path, rows] of [...byPath.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { sensitivity: "base" }),
    )) {
      rows.sort((a, b) => a.id - b.id);
      groups.push({ areaPath: path, rows });
    }
  }

  return groups;
}
