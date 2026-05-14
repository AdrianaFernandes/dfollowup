import type { RoadmapRow } from "./report";

export type AreaStatePivot = {
  areaPaths: string[];
  states: string[];
  /** counts[areaIndex][stateIndex] */
  matrix: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
};

function sortKeysByCountThenAlpha(keys: string[], totals: Map<string, number>): string[] {
  return [...keys].sort((a, b) => {
    const ca = totals.get(a) ?? 0;
    const cb = totals.get(b) ?? 0;
    if (cb !== ca) return cb - ca;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

function pairKey(areaPath: string, state: string) {
  return `${areaPath}\0${state}`;
}

/**
 * Pivot estilo Azure DevOps: linhas = Area Path distinto, colunas = State distinto, células = contagem de work items.
 */
export function buildAreaStatePivot(roadmap: RoadmapRow[]): AreaStatePivot {
  if (roadmap.length === 0) {
    return {
      areaPaths: [],
      states: [],
      matrix: [],
      rowTotals: [],
      colTotals: [],
      grandTotal: 0,
    };
  }

  const pairCounts = new Map<string, number>();
  const areaTotals = new Map<string, number>();
  const stateTotals = new Map<string, number>();

  for (const r of roadmap) {
    const ap = r.areaPath.trim() || "(sem Area Path)";
    const st = r.state.trim() || "(sem estado)";
    const k = pairKey(ap, st);
    pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
    areaTotals.set(ap, (areaTotals.get(ap) ?? 0) + 1);
    stateTotals.set(st, (stateTotals.get(st) ?? 0) + 1);
  }

  const areaPaths = sortKeysByCountThenAlpha([...areaTotals.keys()], areaTotals);
  const states = sortKeysByCountThenAlpha([...stateTotals.keys()], stateTotals);

  const matrix = areaPaths.map((ap) => states.map((st) => pairCounts.get(pairKey(ap, st)) ?? 0));
  const rowTotals = matrix.map((row) => row.reduce((s, n) => s + n, 0));
  const colTotals = states.map((_, si) => matrix.reduce((sum, row) => sum + row[si], 0));
  const grandTotal = rowTotals.reduce((s, n) => s + n, 0);

  return { areaPaths, states, matrix, rowTotals, colTotals, grandTotal };
}

/** Fundo suave por estado (inspirado em gráficos ADO); fallback neutro. */
export function pivotStateCellBg(state: string): string {
  const s = state.trim().toLowerCase();
  if (s === "new" || s.startsWith("new ")) return "rgba(100, 149, 237, 0.22)";
  if (s.includes("closed") || s === "done" || s.includes("complete")) return "rgba(214, 64, 0, 0.15)";
  if (s.includes("active") || s.includes("developing")) return "rgba(0, 90, 158, 0.14)";
  if (s.includes("ready")) return "rgba(103, 58, 183, 0.14)";
  if (s.includes("product definition")) return "rgba(120, 120, 120, 0.12)";
  if (s.includes("tech definition")) return "rgba(255, 183, 77, 0.22)";
  if (s.includes("attention") || s.includes("atenc")) return "rgba(245, 158, 11, 0.2)";
  if (s.includes("removed")) return "rgba(150, 150, 150, 0.12)";
  return "rgba(0, 0, 0, 0.04)";
}
