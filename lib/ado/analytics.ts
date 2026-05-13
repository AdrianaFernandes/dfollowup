import type { ReportFilterInput } from "./filters";
import type { WorkItemRow } from "./workitems";
import { bucketForStateName, type StateBucket } from "./states";

const F_TYPE = "System.WorkItemType";
const F_STATE = "System.State";
const F_TARGET = "Microsoft.VSTS.Scheduling.TargetDate";
const F_TITLE = "System.Title";
const F_TAGS = "System.Tags";
const F_START = "Microsoft.VSTS.Scheduling.StartDate";
const F_CREATED = "System.CreatedDate";
const F_CLOSED = "Microsoft.VSTS.Common.ClosedDate";
const F_AREA = "System.AreaPath";

function strField(f: Record<string, unknown>, ref: string): string {
  const v = f[ref];
  if (v == null) return "";
  return String(v);
}

function parseDate(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fieldDate(f: Record<string, unknown>, ref: string): Date | null {
  return parseDate(strField(f, ref));
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
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

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const m = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[m];
  return (sorted[m - 1]! + sorted[m]!) / 2;
}

function parseTagList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBlockedLike(tags: string, title: string): boolean {
  const t = `${tags} ${title}`.toLowerCase();
  return (
    t.includes("block") ||
    t.includes("bloqueio") ||
    t.includes("impediment") ||
    t.includes("impedimento")
  );
}

function filterDateRange(
  filter: ReportFilterInput,
): { start: Date; end: Date } | null {
  if (filter.dateMode !== "targetDate") return null;
  const a = filter.targetDateStart?.trim();
  const b = filter.targetDateEnd?.trim();
  if (!a || !b) return null;
  const start = new Date(a + "T00:00:00.000Z");
  const end = new Date(b + "T23:59:59.999Z");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

export type LeadTimeStats = {
  median: number | null;
  p85: number | null;
  sampleSize: number;
};

export type MixRow = { workItemType: string; count: number; pct: number };

export type TagCount = { tag: string; count: number };

export type AgingItem = {
  id: number;
  title: string;
  workItemType: string;
  daysOpen: number;
  areaPath: string;
};

export type OverdueByAreaRow = { areaPath: string; overdue: number };

export type AnalyticsSummary = {
  throughputClosed: number;
  throughputClosedInDateWindow: number | null;
  leadTimeDays: LeadTimeStats;
  cycleTimeDays: LeadTimeStats;
  agingOpenDays: LeadTimeStats;
  agingTop: AgingItem[];
  wip: { new: number; active: number; total: number };
  stateDistributionPct: { new: number; active: number; closed: number };
  mixByType: MixRow[];
  topTags: TagCount[];
  blockedOrImpedimentLike: number;
  overdueByArea: OverdueByAreaRow[];
  leadTimeVariabilityRatio: number | null;
  notes: string[];
};

export function buildAnalyticsSummary(
  items: WorkItemRow[],
  stateMap: Map<string, StateBucket>,
  filter: ReportFilterInput,
): AnalyticsSummary {
  const notes: string[] = [];
  const today = startOfTodayUtc();
  const range = filterDateRange(filter);

  const leadDays: number[] = [];
  const cycleDays: number[] = [];
  const openAges: number[] = [];
  const tagCount = new Map<string, number>();
  const typeCount = new Map<string, number>();

  let throughputClosedInWindow: number | null = null;
  if (range) {
    let c = 0;
    for (const wi of items) {
      const f = wi.fields;
      if (bucketForStateName(strField(f, F_STATE), stateMap) !== "closed") continue;
      const cd = fieldDate(f, F_CLOSED);
      if (!cd) continue;
      if (cd.getTime() >= range.start.getTime() && cd.getTime() <= range.end.getTime()) {
        c++;
      }
    }
    throughputClosedInWindow = c;
  }

  let blockedLike = 0;
  let closedN = 0;
  let newN = 0;
  let activeN = 0;

  const openForTop: { wi: WorkItemRow; days: number }[] = [];

  for (const wi of items) {
    const f = wi.fields;
    const state = strField(f, F_STATE);
    const bucket = bucketForStateName(state, stateMap);
    const wtype = strField(f, F_TYPE);
    typeCount.set(wtype, (typeCount.get(wtype) ?? 0) + 1);

    if (bucket === "closed") closedN++;
    else if (bucket === "new") newN++;
    else activeN++;

    const title = strField(f, F_TITLE);
    const tags = strField(f, F_TAGS);
    if (isBlockedLike(tags, title)) blockedLike++;

    for (const tag of parseTagList(tags)) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }

    const created = fieldDate(f, F_CREATED);
    const closedD = fieldDate(f, F_CLOSED);
    const startD = fieldDate(f, F_START);

    if (bucket === "closed" && created && closedD) {
      leadDays.push(daysBetween(created, closedD));
    }
    if (bucket === "closed" && startD && closedD) {
      cycleDays.push(daysBetween(startD, closedD));
    }

    if (bucket !== "closed" && created) {
      const age = daysBetween(created, today);
      openAges.push(age);
      openForTop.push({ wi, days: age });
    }
  }

  const total = items.length || 1;
  const mixByType: MixRow[] = [...typeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([workItemType, count]) => ({
      workItemType,
      count,
      pct: count / total,
    }));

  const topTags: TagCount[] = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }));

  leadDays.sort((a, b) => a - b);
  cycleDays.sort((a, b) => a - b);
  openAges.sort((a, b) => a - b);

  const ltMed = median(leadDays);
  const ltP85 = percentile(leadDays, 85);
  let variability: number | null = null;
  if (ltMed != null && ltMed > 0 && ltP85 != null) {
    variability = ltP85 / ltMed;
  }

  openForTop.sort((a, b) => b.days - a.days);
  const agingTop: AgingItem[] = openForTop.slice(0, 5).map(({ wi, days }) => {
    const f = wi.fields;
    return {
      id: wi.id,
      title: strField(f, F_TITLE).slice(0, 120),
      workItemType: strField(f, F_TYPE),
      daysOpen: days,
      areaPath: strField(f, F_AREA),
    };
  });

  const overdueByArea: OverdueByAreaRow[] = filter.areaPaths.map((ap) => {
    let overdue = 0;
    for (const wi of items) {
      const f = wi.fields;
      if (bucketForStateName(strField(f, F_STATE), stateMap) === "closed") continue;
      if (!itemUnderAreaPath(strField(f, F_AREA), ap)) continue;
      const td = fieldDate(f, F_TARGET);
      if (td && td < today) overdue++;
    }
    return { areaPath: ap, overdue };
  });

  if (leadDays.length === 0) {
    notes.push(
      "Lead time: sem amostra (itens fechados sem Created + Closed date preenchidos).",
    );
  }
  if (cycleDays.length === 0) {
    notes.push(
      "Cycle time: sem amostra (itens fechados sem Start Date + Closed date preenchidos).",
    );
  }

  return {
    throughputClosed: closedN,
    throughputClosedInDateWindow: throughputClosedInWindow,
    leadTimeDays: {
      median: ltMed,
      p85: ltP85,
      sampleSize: leadDays.length,
    },
    cycleTimeDays: {
      median: median(cycleDays),
      p85: percentile(cycleDays, 85),
      sampleSize: cycleDays.length,
    },
    agingOpenDays: {
      median: median(openAges),
      p85: percentile(openAges, 85),
      sampleSize: openAges.length,
    },
    agingTop,
    wip: {
      new: newN,
      active: activeN,
      total: newN + activeN,
    },
    stateDistributionPct: {
      new: newN / total,
      active: activeN / total,
      closed: closedN / total,
    },
    mixByType,
    topTags,
    blockedOrImpedimentLike: blockedLike,
    overdueByArea,
    leadTimeVariabilityRatio: variability,
    notes,
  };
}
