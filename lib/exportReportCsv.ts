import type { ReportResult } from "@/lib/ado/report";
import { downloadCsv, pctCsv } from "@/lib/exportCsv";

export function exportConsolidatedCsv(report: ReportResult) {
  const c = report.consolidated;
  const f = report.filter;
  downloadCsv(
    [
      {
        Projeto: f.project,
        "Modo data": f.dateMode,
        Iterações:
          f.dateMode === "iteration" ? (f.iterationPaths ?? []).join(" | ") : "",
        "Target início": f.targetDateStart ?? "",
        "Target fim": f.targetDateEnd ?? "",
        Tipos: f.workItemTypes.join("; "),
        Estados: f.states?.length ? f.states.join("; ") : "(todos)",
        Total: c.total,
        Closed: c.closed,
        Active: c.active,
        New: c.new,
        Atrasadas: c.overdue,
        Features: c.featureTotal,
        "Taxa conclusão": pctCsv(c.completionRate),
        Eficiência: c.efficiencyRate == null ? "N/D" : pctCsv(c.efficiencyRate),
        "Nota eficiência": c.efficiencyLabel,
      },
    ],
    `consolidado-${f.project.replace(/[^\w.-]+/g, "_")}.csv`,
  );
}

export function exportAreasCsv(report: ReportResult) {
  const rows = report.byArea.map((a) => ({
    "Area Path": a.areaPath,
    Total: a.total,
    Closed: a.closed,
    Active: a.active,
    New: a.new,
    Atrasadas: a.overdue,
    Features: a.featureTotal,
    "Taxa conclusão": pctCsv(a.completionRate),
    Eficiência: a.efficiencyRate == null ? "N/D" : pctCsv(a.efficiencyRate),
    "Nota eficiência": a.efficiencyLabel,
  }));
  if (!rows.length) return;
  downloadCsv(rows, `por-area-${report.filter.project.replace(/[^\w.-]+/g, "_")}.csv`);
}

export function exportAnalyticsCsv(report: ReportResult) {
  const a = report.analytics;
  const rows: Record<string, string | number>[] = [
    { Secção: "throughput", Métrica: "closed_total", Valor: a.throughputClosed, Detalhe: "" },
    {
      Secção: "throughput",
      Métrica: "closed_in_target_window",
      Valor: a.throughputClosedInDateWindow ?? "",
      Detalhe: "",
    },
    { Secção: "leadTime", Métrica: "median_days", Valor: a.leadTimeDays.median ?? "", Detalhe: "" },
    { Secção: "leadTime", Métrica: "p85_days", Valor: a.leadTimeDays.p85 ?? "", Detalhe: "" },
    { Secção: "leadTime", Métrica: "sample", Valor: a.leadTimeDays.sampleSize, Detalhe: "" },
    { Secção: "cycleTime", Métrica: "median_days", Valor: a.cycleTimeDays.median ?? "", Detalhe: "" },
    { Secção: "cycleTime", Métrica: "p85_days", Valor: a.cycleTimeDays.p85 ?? "", Detalhe: "" },
    { Secção: "cycleTime", Métrica: "sample", Valor: a.cycleTimeDays.sampleSize, Detalhe: "" },
    { Secção: "agingOpen", Métrica: "median_days", Valor: a.agingOpenDays.median ?? "", Detalhe: "" },
    { Secção: "agingOpen", Métrica: "p85_days", Valor: a.agingOpenDays.p85 ?? "", Detalhe: "" },
    { Secção: "wip", Métrica: "new", Valor: a.wip.new, Detalhe: "" },
    { Secção: "wip", Métrica: "active", Valor: a.wip.active, Detalhe: "" },
    { Secção: "wip", Métrica: "total", Valor: a.wip.total, Detalhe: "" },
    { Secção: "statePct", Métrica: "new", Valor: pctCsv(a.stateDistributionPct.new), Detalhe: "" },
    { Secção: "statePct", Métrica: "active", Valor: pctCsv(a.stateDistributionPct.active), Detalhe: "" },
    { Secção: "statePct", Métrica: "closed", Valor: pctCsv(a.stateDistributionPct.closed), Detalhe: "" },
    {
      Secção: "variability",
      Métrica: "lead_time_ratio",
      Valor: a.leadTimeVariabilityRatio == null ? "" : String(a.leadTimeVariabilityRatio),
      Detalhe: "",
    },
    { Secção: "blocked", Métrica: "count_heuristic", Valor: a.blockedOrImpedimentLike, Detalhe: "" },
  ];
  for (const m of a.mixByType) {
    rows.push({
      Secção: "mixByType",
      Métrica: m.workItemType,
      Valor: m.count,
      Detalhe: pctCsv(m.pct),
    });
  }
  for (const t of a.topTags) {
    rows.push({ Secção: "topTags", Métrica: t.tag, Valor: t.count, Detalhe: "" });
  }
  for (const o of a.overdueByArea) {
    rows.push({ Secção: "overdueByArea", Métrica: o.areaPath, Valor: o.overdue, Detalhe: "" });
  }
  for (const it of a.agingTop) {
    rows.push({
      Secção: "agingTop",
      Métrica: String(it.id),
      Valor: it.daysOpen,
      Detalhe: `${it.workItemType} — ${it.title}`.slice(0, 500),
    });
  }
  for (let i = 0; i < a.notes.length; i++) {
    rows.push({ Secção: "notes", Métrica: String(i), Valor: "", Detalhe: a.notes[i] ?? "" });
  }
  downloadCsv(rows, `analises-${report.filter.project.replace(/[^\w.-]+/g, "_")}.csv`);
}
