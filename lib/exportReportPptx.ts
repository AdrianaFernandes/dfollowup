"use client";

import PptxGenJS from "pptxgenjs";
import type { ReportResult } from "@/lib/ado/report";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export async function downloadReportPptx(report: ReportResult, filename?: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const proj = report.filter.project;

  const s1 = pptx.addSlide();
  s1.addText("Delivery Follow-up", { x: 0.5, y: 0.4, fontSize: 28, bold: true });
  s1.addText(proj, { x: 0.5, y: 1.1, fontSize: 18 });
  s1.addText(
    report.filter.dateMode === "iteration"
      ? `Iteração: ${report.filter.iterationPaths?.length ?? 0} path(s)`
      : `Target Date: ${report.filter.targetDateStart ?? ""} → ${report.filter.targetDateEnd ?? ""}`,
    { x: 0.5, y: 1.55, fontSize: 14, color: "666666" },
  );

  const s2 = pptx.addSlide();
  s2.addText("Consolidado", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  const c = report.consolidated;
  s2.addText(
    [
      `Total: ${c.total}`,
      `Closed: ${c.closed}  |  Active: ${c.active}  |  New: ${c.new}`,
      `Atrasadas: ${c.overdue}  |  Features: ${c.featureTotal}`,
      `Conclusão: ${pct(c.completionRate)}`,
    ].join("\n"),
    { x: 0.5, y: 1, fontSize: 16, valign: "top" },
  );

  const s3 = pptx.addSlide();
  s3.addText("Por área (top 12)", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  const rows = report.byArea.slice(0, 12).map((a) => ({
    area: a.areaPath.length > 48 ? `${a.areaPath.slice(0, 46)}…` : a.areaPath,
    t: String(a.total),
    cl: String(a.closed),
    pct: pct(a.completionRate),
  }));
  const tableRows = [
    [
      { text: "Area Path", options: { bold: true } },
      { text: "Tot", options: { bold: true } },
      { text: "Closed", options: { bold: true } },
      { text: "%", options: { bold: true } },
    ],
    ...rows.map((r) => [{ text: r.area }, { text: r.t }, { text: r.cl }, { text: r.pct }]),
  ];
  s3.addTable(tableRows, {
      x: 0.4,
      y: 0.95,
      w: 9.2,
      colW: [5.2, 1, 1.2, 1.8],
      fontSize: 10,
      border: { type: "solid", color: "CCCCCC", pt: 0.5 },
    },
  );

  const s4 = pptx.addSlide();
  s4.addText("Análises (resumo)", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  const a = report.analytics;
  s4.addText(
    [
      `Throughput (closed): ${a.throughputClosed}`,
      `Lead time mediana: ${a.leadTimeDays.median ?? "N/D"} d`,
      `WIP: ${a.wip.total} (New ${a.wip.new} / Active ${a.wip.active})`,
      `Bloqueio/heurística: ${a.blockedOrImpedimentLike}`,
    ].join("\n"),
    { x: 0.5, y: 1, fontSize: 15, valign: "top" },
  );

  const safe = filename ?? `relatorio-${proj.replace(/[^\w.-]+/g, "_")}.pptx`;
  await pptx.writeFile({ fileName: safe });
}
