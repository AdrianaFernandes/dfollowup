import { reportFilterSchema, WORK_ITEM_TYPES } from "./filters";
import { buildIdsOnlyWiql } from "./wiql";
import { runWiql } from "./wiqlRun";
import { fetchWorkItemsByIdsSafeFields } from "./workitems";
import { ROADMAP_FIELD_REFS } from "./constants";
import { fetchStateBucketsForTypes } from "./states";
import { computeDescendantRollupProgress } from "./descendantRollup";
import { buildAnalyticsSummary } from "./analytics";
import { buildReport, type ReportResult } from "./report";

const MAX_IDS = 20000;

export async function runDeliveryReport(
  raw: unknown,
): Promise<
  | { ok: true; data: ReportResult }
  | { ok: false; status: number; error: string; details?: unknown }
> {
  const parsed = reportFilterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Filtros inválidos",
      details: parsed.error.flatten(),
    };
  }
  const filter = parsed.data;

  const wiql = buildIdsOnlyWiql(filter);
  let ids: number[];
  try {
    ids = await runWiql(filter.project, wiql, MAX_IDS);
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : "Falha na WIQL",
    };
  }

  const warnings: string[] = [];
  if (ids.length >= MAX_IDS) {
    warnings.push(
      `A consulta atingiu o limite de ${MAX_IDS} itens retornados pela WIQL; pode haver mais resultados. Refine área, iteração ou datas.`,
    );
  }

  let items;
  try {
    const res = await fetchWorkItemsByIdsSafeFields(filter.project, ids, [
      ...ROADMAP_FIELD_REFS,
    ]);
    items = res.items;
    if (res.droppedFields.length) {
      warnings.push(
        `Campos omitidos (inexistentes no processo): ${res.droppedFields.join(", ")}`,
      );
    }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : "Falha ao carregar work items",
    };
  }

  const typesForStates = [...new Set([...filter.workItemTypes, ...WORK_ITEM_TYPES])];

  let stateMap;
  try {
    stateMap = await fetchStateBucketsForTypes(filter.project, typesForStates);
  } catch {
    stateMap = new Map();
    warnings.push("Não foi possível carregar metadados de estados; heurística simples será usada.");
  }

  let progressByRootId: Map<number, number | null>;
  try {
    progressByRootId = await computeDescendantRollupProgress(
      filter.project,
      items.map((w) => w.id),
      stateMap,
      warnings,
    );
  } catch (e) {
    warnings.push(
      `Rollup de progresso falhou: ${e instanceof Error ? e.message : String(e)}. Coluna Progresso fica vazia.`,
    );
    progressByRootId = new Map(items.map((w) => [w.id, null]));
  }

  const analytics = buildAnalyticsSummary(items, stateMap, filter);

  const data = buildReport(
    filter,
    wiql,
    items,
    stateMap,
    warnings,
    progressByRootId,
    analytics,
  );
  return { ok: true, data };
}
