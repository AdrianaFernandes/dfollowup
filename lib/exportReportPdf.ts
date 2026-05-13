"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportResult } from "@/lib/ado/report";

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function downloadReportPdf(report: ReportResult, filename?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const proj = report.filter.project;
  let y = 14;
  doc.setFontSize(16);
  doc.text("Delivery Follow-up", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Projeto: ${proj}`, 14, y);
  y += 6;
  doc.text(
    report.filter.dateMode === "iteration"
      ? `Modo: Iteração (${report.filter.iterationPaths?.length ?? 0} path(s))`
      : `Modo: Target Date ${report.filter.targetDateStart ?? ""} → ${report.filter.targetDateEnd ?? ""}`,
    14,
    y,
  );
  y += 6;
  doc.text(`Tipos: ${report.filter.workItemTypes.join(", ")}`, 14, y);
  y += 10;

  doc.setFontSize(12);
  doc.text("Consolidado", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total", String(report.consolidated.total)],
      ["Closed", String(report.consolidated.closed)],
      ["Active", String(report.consolidated.active)],
      ["New", String(report.consolidated.new)],
      ["Atrasadas", String(report.consolidated.overdue)],
      ["Features", String(report.consolidated.featureTotal)],
      ["Taxa conclusão", pct(report.consolidated.completionRate)],
      [
        "Eficiência",
        report.consolidated.efficiencyRate == null
          ? "N/D"
          : pct(report.consolidated.efficiencyRate),
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
  });
  y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 10;

  doc.setFontSize(12);
  doc.text("Por Area Path", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Area Path", "Tot", "Cl", "Act", "New", "Atr", "Feat", "%Conc"]],
    body: report.byArea.map((a) => [
      a.areaPath.length > 42 ? `${a.areaPath.slice(0, 40)}…` : a.areaPath,
      String(a.total),
      String(a.closed),
      String(a.active),
      String(a.new),
      String(a.overdue),
      String(a.featureTotal),
      pct(a.completionRate),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [66, 66, 66] },
  });
  y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 10;

  if (y > 250) {
    doc.addPage();
    y = 14;
  }
  doc.setFontSize(12);
  doc.text("Análises (resumo)", 14, y);
  y += 4;
  const a = report.analytics;
  autoTable(doc, {
    startY: y,
    head: [["Métrica", "Valor"]],
    body: [
      ["Throughput (closed)", String(a.throughputClosed)],
      [
        "Lead time mediana (d)",
        a.leadTimeDays.median == null ? "N/D" : String(a.leadTimeDays.median),
      ],
      [
        "Cycle time mediana (d)",
        a.cycleTimeDays.median == null ? "N/D" : String(a.cycleTimeDays.median),
      ],
      ["WIP total", String(a.wip.total)],
      ["Bloqueio / impedimento (heur.)", String(a.blockedOrImpedimentLike)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
  });
  y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 10;

  if (report.roadmap.length && y < 240) {
    doc.setFontSize(12);
    doc.text(`Roadmap (${report.roadmap.length} itens, primeiras 25 linhas)`, 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["ID", "Tipo", "Estado", "%", "Target", "Título"]],
      body: report.roadmap.slice(0, 25).map((r) => [
        String(r.id),
        r.workItemType,
        r.state,
        r.progressPercent == null ? "" : String(r.progressPercent),
        r.targetDate,
        r.title.length > 36 ? `${r.title.slice(0, 34)}…` : r.title,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [66, 66, 66] },
    });
  }

  const safe = filename ?? `relatorio-${proj.replace(/[^\w.-]+/g, "_")}.pdf`;
  doc.save(safe);
}
