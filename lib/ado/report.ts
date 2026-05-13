import type { ReportFilterInput } from "./filters";
import type { WorkItemRow } from "./workitems";
import { bucketForStateName, type StateBucket } from "./states";
import type { AnalyticsSummary } from "./analytics";

const F_TYPE = "System.WorkItemType";
const F_STATE = "System.State";
const F_TARGET = "Microsoft.VSTS.Scheduling.TargetDate";
const F_TITLE = "System.Title";
const F_TAGS = "System.Tags";
const F_START = "Microsoft.VSTS.Scheduling.StartDate";
const F_COMMITTED = "Custom.CommittedDate";
const F_AREA = "System.AreaPath";
const F_ITER = "System.IterationPath";

function strField(f: Record<string, unknown>, ref: string): string {
  const v = f[ref];
  if (v == null) return "";
  return String(v);
}

function parseDateOnly(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function itemUnderAreaPath(itemArea: string, areaPath: string): boolean {
  const a = itemArea.trim();
  const p = areaPath.trim();
  if (!a || !p) return false;
  if (a === p) return true;
  return a.startsWith(p + "\\");
}

export type RoadmapRow = {
  id: number;
  workItemType: string;
  state: string;
  /** Rollup ADO: descendentes em Completed / total descendentes; null se não houver descendentes */
  progressPercent: number | null;
  targetDate: string;
  title: string;
  tags: string;
  startDate: string;
  committedDate: string;
  areaPath: string;
  iterationPath: string;
};

export type AreaSummary = {
  areaPath: string;
  total: number;
  closed: number;
  active: number;
  new: number;
  overdue: number;
  featureTotal: number;
  completionRate: number;
  efficiencyRate: number | null;
  efficiencyLabel: string;
};

export type ConsolidatedSummary = {
  total: number;
  closed: number;
  active: number;
  new: number;
  overdue: number;
  featureTotal: number;
  completionRate: number;
  efficiencyRate: number | null;
  efficiencyLabel: string;
};

export type ReportResult = {
  filter: ReportFilterInput;
  wiql: string;
  warnings: string[];
  roadmap: RoadmapRow[];
  consolidated: ConsolidatedSummary;
  byArea: AreaSummary[];
  analytics: AnalyticsSummary;
};

function computeEfficiency(
  items: WorkItemRow[],
): { rate: number | null; label: string } {
  let eligible = 0;
  let onTime = 0;
  for (const wi of items) {
    const f = wi.fields;
    const td = parseDateOnly(strField(f, F_TARGET));
    const cd = parseDateOnly(strField(f, F_COMMITTED));
    if (!td || !cd) continue;
    eligible++;
    if (cd.getTime() <= td.getTime()) onTime++;
  }
  if (eligible === 0) {
    return {
      rate: null,
      label: "N/D (sem Target Date e Committed date no mesmo item)",
    };
  }
  return {
    rate: onTime / eligible,
    label: "Itens com ambas as datas: Committed ≤ Target",
  };
}

function summarizeSubset(
  items: WorkItemRow[],
  stateMap: Map<string, StateBucket>,
  typesSelected: Set<string>,
): {
  total: number;
  closed: number;
  active: number;
  new: number;
  overdue: number;
  featureTotal: number;
} {
  const today = startOfTodayUtc();
  let closed = 0;
  let active = 0;
  let newC = 0;
  let overdue = 0;
  let featureTotal = 0;

  for (const wi of items) {
    const f = wi.fields;
    const state = strField(f, F_STATE);
    const b = bucketForStateName(state, stateMap);
    if (b === "closed") closed++;
    else if (b === "new") newC++;
    else active++;

    const wtype = strField(f, F_TYPE);
    if (wtype === "Feature" && typesSelected.has("Feature")) {
      featureTotal++;
    }

    const td = parseDateOnly(strField(f, F_TARGET));
    if (td && td < today && b !== "closed") {
      overdue++;
    }
  }

  return {
    total: items.length,
    closed,
    active,
    new: newC,
    overdue,
    featureTotal,
  };
}

export function buildReport(
  filter: ReportFilterInput,
  wiql: string,
  items: WorkItemRow[],
  stateMap: Map<string, StateBucket>,
  warnings: string[],
  progressByRootId: Map<number, number | null>,
  analytics: AnalyticsSummary,
): ReportResult {
  const typesSelected = new Set(filter.workItemTypes);

  const roadmap: RoadmapRow[] = items.map((wi) => {
    const f = wi.fields;
    return {
      id: wi.id,
      workItemType: strField(f, F_TYPE),
      state: strField(f, F_STATE),
      progressPercent: progressByRootId.get(wi.id) ?? null,
      targetDate: strField(f, F_TARGET),
      title: strField(f, F_TITLE),
      tags: strField(f, F_TAGS),
      startDate: strField(f, F_START),
      committedDate: strField(f, F_COMMITTED),
      areaPath: strField(f, F_AREA),
      iterationPath: strField(f, F_ITER),
    };
  });

  const base = summarizeSubset(items, stateMap, typesSelected);
  const effAll = computeEfficiency(items);
  const completionRate = base.total ? base.closed / base.total : 0;

  const consolidated: ConsolidatedSummary = {
    ...base,
    completionRate,
    efficiencyRate: effAll.rate,
    efficiencyLabel: effAll.label,
  };

  const byArea: AreaSummary[] = filter.areaPaths.map((ap) => {
    const subset = items.filter((wi) => itemUnderAreaPath(strField(wi.fields, F_AREA), ap));
    const s = summarizeSubset(subset, stateMap, typesSelected);
    const eff = computeEfficiency(subset);
    const cr = s.total ? s.closed / s.total : 0;
    return {
      areaPath: ap,
      ...s,
      completionRate: cr,
      efficiencyRate: eff.rate,
      efficiencyLabel: eff.label,
    };
  });

  return {
    filter,
    wiql,
    warnings,
    roadmap,
    consolidated,
    byArea,
    analytics,
  };
}
