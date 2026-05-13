import type { ReportResult } from "./report";

export type ExecutiveVelocity = {
  rate: number;
  headline: string;
  detail: string;
};

/** Inclusive calendar days (UTC date-only) between two YYYY-MM-DD strings. */
function calendarDaysInclusiveUtc(startStr: string, endStr: string): number | null {
  const a = startStr.trim();
  const b = endStr.trim();
  if (!a || !b) return null;
  const start = new Date(`${a}T00:00:00.000Z`);
  const end = new Date(`${b}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() < start.getTime()) return null;
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * Closed work items per period unit derived from the report filter.
 * Iteration: closed / number of selected iteration paths.
 * Target date: closed / inclusive day span of the range.
 */
export function getExecutiveVelocity(report: ReportResult): ExecutiveVelocity {
  const closed = report.consolidated.closed;
  const f = report.filter;

  if (f.dateMode === "iteration") {
    const n = Math.max(1, f.iterationPaths?.length ?? 1);
    const rate = closed / n;
    const headline = rate.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
    return {
      rate,
      headline,
      detail: `WI fechados / path de iteração (${n} seleccionado(s))`,
    };
  }

  const start = f.targetDateStart?.trim() ?? "";
  const end = f.targetDateEnd?.trim() ?? "";
  const days = calendarDaysInclusiveUtc(start, end);
  if (days == null) {
    return {
      rate: closed,
      headline: closed.toLocaleString("pt-PT"),
      detail: "Período Target Date inválido — total de WI fechados (denominador 1).",
    };
  }
  const denom = Math.max(1, days);
  const rate = closed / denom;
  const headline = rate.toLocaleString("pt-PT", { maximumFractionDigits: 2 });
  return {
    rate,
    headline,
    detail: `WI fechados / dia (${denom} d, ${start} → ${end})`,
  };
}
