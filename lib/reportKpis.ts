import type { ReportResult } from "@/lib/ado/report";

/** Light KPI payload stored in ReportSnapshot and used for deltas. */
export type ReportKpiPayload = {
  total: number;
  closed: number;
  active: number;
  new: number;
  overdue: number;
  featureTotal: number;
  completionRate: number;
  efficiencyRate: number | null;
  throughputClosed: number;
  leadTimeMedian: number | null;
};

export function buildReportKpiPayload(report: ReportResult): ReportKpiPayload {
  const c = report.consolidated;
  const a = report.analytics;
  return {
    total: c.total,
    closed: c.closed,
    active: c.active,
    new: c.new,
    overdue: c.overdue,
    featureTotal: c.featureTotal,
    completionRate: c.completionRate,
    efficiencyRate: c.efficiencyRate,
    throughputClosed: a.throughputClosed,
    leadTimeMedian: a.leadTimeDays.median,
  };
}

export function formatDelta(prev: number, next: number, isRate = false): string {
  const d = next - prev;
  if (isRate) {
    const pctPts = d * 100;
    const sign = pctPts > 0 ? "+" : "";
    return `${sign}${pctPts.toFixed(1)} pp`;
  }
  const sign = d > 0 ? "+" : "";
  return `${sign}${d}`;
}
