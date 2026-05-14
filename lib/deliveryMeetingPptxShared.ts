import type { ReportResult } from "@/lib/ado/report";

export const DELIVERY_MEETING_NO_DATA_PT =
  "Gere o relatório no assistente (passo 4) para preencher este deck com dados do Azure DevOps.";

export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function safeFilenamePart(raw: string) {
  return raw.replace(/[^\w.-]+/g, "_").slice(0, 80) || "delivery";
}

export function sprintLine(f: ReportResult["filter"]): string {
  if (f.dateMode === "iteration") {
    const n = f.iterationPaths?.length ?? 0;
    return `Iteração: ${n} path(s) selecionado(s)`;
  }
  return `Target Date: ${f.targetDateStart ?? ""} → ${f.targetDateEnd ?? ""}`;
}

export function areasShort(f: ReportResult["filter"], max = 4): string {
  const parts = f.areaPaths.slice(0, max).map((p) => (p.length > 48 ? `${p.slice(0, 46)}…` : p));
  const extra = f.areaPaths.length > max ? ` (+${f.areaPaths.length - max} áreas)` : "";
  return parts.join(" | ") + extra;
}

export function analyticsBlock(r: ReportResult): string {
  const a = r.analytics;
  const f = r.filter;
  return [
    `Projeto: ${f.project}`,
    `Tipos: ${f.workItemTypes.join(", ")}`,
    `Throughput (closed): ${a.throughputClosed} · WIP: ${a.wip.total} (New ${a.wip.new} / Active ${a.wip.active})`,
    `Lead time med.: ${a.leadTimeDays.median ?? "N/D"} d · Cycle med.: ${a.cycleTimeDays.median ?? "N/D"} d`,
    `Aging abertos med.: ${a.agingOpenDays.median ?? "N/D"} d · Bloqueios (heur.): ${a.blockedOrImpedimentLike}`,
    `Estado %: New ${pct(a.stateDistributionPct.new)} · Active ${pct(a.stateDistributionPct.active)} · Closed ${pct(a.stateDistributionPct.closed)}`,
  ].join("\n");
}

export function isClosedLikeState(state: string): boolean {
  const s = state.trim().toLowerCase();
  return (
    s.includes("closed") ||
    s.includes("complete") ||
    s === "done" ||
    s.includes("resolved") ||
    s === "removed"
  );
}

export function metaLine(report: ReportResult | null): string {
  if (!report) return "";
  return `${report.filter.project} · ${sprintLine(report.filter)}`;
}

export function formatMeetingDatePt(when: Date): string {
  return when.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
