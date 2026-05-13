import { runWiql } from "./wiqlRun";
import { fetchWorkItemsByIds } from "./workitems";
import { bucketForStateName, type StateBucket } from "./states";

const F_PARENT = "System.Parent";
const F_STATE = "System.State";

const PARENT_CHUNK = 80;
/** Limite global de descendentes carregados por relatório (evita timeouts em árvores enormes). */
export const MAX_DESCENDANTS_TOTAL = 30000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function parentIdFrom(fields: Record<string, unknown>): number | null {
  const v = fields[F_PARENT];
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function strField(f: Record<string, unknown>, ref: string): string {
  const v = f[ref];
  if (v == null) return "";
  return String(v);
}

type NodeMeta = { parentId: number; completed: boolean };

/**
 * Progress alinhado ao ADO "Progress by all Work Items": entre descendentes (parent→child),
 * percentagem = concluídos (category Completed → bucket closed) / total descendentes.
 */
export async function computeDescendantRollupProgress(
  project: string,
  rootIds: number[],
  stateMap: Map<string, StateBucket>,
  warnings: string[],
): Promise<Map<number, number | null>> {
  const result = new Map<number, number | null>();
  if (rootIds.length === 0) return result;

  const rootSet = new Set(rootIds);
  for (const id of rootIds) result.set(id, null);

  const nodes = new Map<number, NodeMeta>();
  let frontier = [...rootIds];
  let fetchedTotal = 0;
  let truncated = false;

  while (frontier.length > 0 && fetchedTotal < MAX_DESCENDANTS_TOTAL && !truncated) {
    const waveIds = new Set<number>();
    const remaining = MAX_DESCENDANTS_TOTAL - fetchedTotal;

    for (const group of chunk(frontier, PARENT_CHUNK)) {
      const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.Parent] IN (${group.join(",")})`;
      const ids = await runWiql(project, wiql, Math.min(20000, remaining));
      for (const id of ids) {
        if (!nodes.has(id)) waveIds.add(id);
      }
      if (waveIds.size >= remaining) {
        truncated = true;
        break;
      }
    }

    if (waveIds.size === 0) break;

    const toFetch = [...waveIds].slice(0, MAX_DESCENDANTS_TOTAL - fetchedTotal);
    if (toFetch.length === 0) break;

    const rows = await fetchWorkItemsByIds(project, toFetch, [F_PARENT, F_STATE]);
    fetchedTotal += rows.length;

    const nextFrontier: number[] = [];
    for (const wi of rows) {
      const pid = parentIdFrom(wi.fields);
      if (pid == null) continue;
      const completed =
        bucketForStateName(strField(wi.fields, F_STATE), stateMap) === "closed";
      nodes.set(wi.id, { parentId: pid, completed });
      nextFrontier.push(wi.id);
    }

    frontier = nextFrontier;
  }

  if (truncated || fetchedTotal >= MAX_DESCENDANTS_TOTAL) {
    warnings.push(
      `Rollup de progresso: limite de ${MAX_DESCENDANTS_TOTAL} descendentes carregados; árvore pode estar incompleta. Refine o filtro WIQL.`,
    );
  }

  const totals = new Map<number, number>();
  const completedN = new Map<number, number>();
  for (const r of rootIds) {
    totals.set(r, 0);
    completedN.set(r, 0);
  }

  /** Raízes do roadmap que são ancestrais na cadeia parent até ao nó. */
  function rootsAboveNode(nodeId: number): number[] {
    const found: number[] = [];
    let cur = nodeId;
    for (let i = 0; i < 10000; i++) {
      const meta = nodes.get(cur);
      if (!meta) break;
      const p = meta.parentId;
      if (rootSet.has(p)) found.push(p);
      cur = p;
    }
    return found;
  }

  for (const id of nodes.keys()) {
    const meta = nodes.get(id)!;
    const roots = rootsAboveNode(id);
    for (const R of roots) {
      totals.set(R, (totals.get(R) ?? 0) + 1);
      if (meta.completed) {
        completedN.set(R, (completedN.get(R) ?? 0) + 1);
      }
    }
  }

  for (const R of rootIds) {
    const t = totals.get(R) ?? 0;
    const c = completedN.get(R) ?? 0;
    result.set(R, t === 0 ? null : Math.round((c / t) * 100));
  }

  return result;
}
