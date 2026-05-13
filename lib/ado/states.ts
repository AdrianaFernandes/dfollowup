import { adoFetch } from "./client";
import { ADO_API_VERSION } from "./constants";
import type { WorkItemTypeName } from "./filters";

type StateRow = {
  name: string;
  category?: string;
};

type StatesResponse = {
  value?: StateRow[];
  states?: StateRow[];
};

export type StateBucket = "new" | "active" | "closed";

function normalizeCategory(raw?: string): string {
  return (raw ?? "").toLowerCase();
}

/** Map ADO state category to New / Active / Closed buckets. */
export function categoryToBucket(category: string): StateBucket {
  const c = category.toLowerCase();
  if (c === "proposed") return "new";
  if (c === "completed") return "closed";
  return "active";
}

export async function fetchStateBucketsForTypes(
  project: string,
  types: WorkItemTypeName[],
): Promise<Map<string, StateBucket>> {
  const enc = encodeURIComponent(project);
  const map = new Map<string, StateBucket>();

  await Promise.all(
    types.map(async (wit) => {
      const t = encodeURIComponent(wit);
      const path = `/${enc}/_apis/wit/workitemtypes/${t}/states?api-version=${ADO_API_VERSION}`;
      try {
        const res = await adoFetch<StatesResponse>(path);
        const rows = res.value ?? res.states ?? [];
        for (const row of rows) {
          const name = row.name?.trim();
          if (!name) continue;
          const bucket = categoryToBucket(normalizeCategory(row.category));
          const key = name.toLowerCase();
          const prev = map.get(key);
          if (!prev || bucket === "closed") {
            map.set(key, bucket);
          }
        }
      } catch {
        // ignore missing type in process
      }
    }),
  );

  return map;
}

export function bucketForStateName(
  stateName: string,
  stateMap: Map<string, StateBucket>,
): StateBucket {
  const key = stateName.trim().toLowerCase();
  const b = stateMap.get(key);
  if (b) return b;
  const s = stateName.trim().toLowerCase();
  if (s === "new" || s === "proposed") return "new";
  if (s.includes("closed") || s.includes("complete") || s === "done" || s === "removed") {
    return "closed";
  }
  return "active";
}

/** Texto curto para ajuda na UI (espelha `categoryToBucket`). */
export const STATE_BUCKET_GLOSSARY_PT = {
  new: "Bucket «New»: estados ADO na categoria Proposed (propostos / ainda não arrancados).",
  active:
    "Bucket «Active»: estados que não são Proposed nem Completed — trabalho em curso ou pendente de conclusão.",
  closed: "Bucket «Closed»: estados na categoria Completed (entregue / fechado no processo do tipo).",
} as const;
