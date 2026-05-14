import { adoFetch } from "./client";
import { ADO_API_VERSION } from "./constants";

export type WorkItemRow = {
  id: number;
  rev?: number;
  fields: Record<string, unknown>;
};

type WorkItemsResponse = {
  value: WorkItemRow[];
};

const CHUNK = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function fetchWorkItemsByIds(
  project: string,
  ids: number[],
  fieldRefs: string[],
): Promise<WorkItemRow[]> {
  if (ids.length === 0) return [];
  const enc = encodeURIComponent(project);
  const fieldsParam = fieldRefs.map(encodeURIComponent).join(",");
  const all: WorkItemRow[] = [];

  for (const group of chunk(ids, CHUNK)) {
    const idStr = group.join(",");
    const path =
      `/${enc}/_apis/wit/workitems?ids=${idStr}` +
      `&fields=${fieldsParam}&api-version=${ADO_API_VERSION}`;
    const res = await adoFetch<WorkItemsResponse | WorkItemRow>(path);
    const value = Array.isArray((res as WorkItemsResponse).value)
      ? (res as WorkItemsResponse).value
      : res && typeof res === "object" && "id" in (res as WorkItemRow)
        ? [res as WorkItemRow]
        : [];
    all.push(...value);
  }
  return all;
}

export async function fetchWorkItemsByIdsSafeFields(
  project: string,
  ids: number[],
  fieldRefs: string[],
): Promise<{ items: WorkItemRow[]; droppedFields: string[] }> {
  const dropped: string[] = [];
  let fields = [...fieldRefs];
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const items = await fetchWorkItemsByIds(project, ids, fields);
      return { items, droppedFields: dropped };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Custom.CommittedDate") || msg.includes("CommittedDate")) {
        fields = fields.filter((f) => f !== "Custom.CommittedDate");
        dropped.push("Custom.CommittedDate");
        continue;
      }
      if (msg.includes("Microsoft.VSTS.Common.ClosedDate") || msg.includes("ClosedDate")) {
        fields = fields.filter((f) => f !== "Microsoft.VSTS.Common.ClosedDate");
        dropped.push("Microsoft.VSTS.Common.ClosedDate");
        continue;
      }
      if (msg.includes("StoryPoints") || msg.includes("Scheduling.StoryPoints")) {
        fields = fields.filter((f) => f !== "Microsoft.VSTS.Scheduling.StoryPoints");
        dropped.push("Microsoft.VSTS.Scheduling.StoryPoints");
        continue;
      }
      if (msg.includes("System.Parent")) {
        fields = fields.filter((f) => f !== "System.Parent");
        dropped.push("System.Parent");
        continue;
      }
      throw e;
    }
  }
  const items = await fetchWorkItemsByIds(project, ids, fields);
  return { items, droppedFields: dropped };
}
