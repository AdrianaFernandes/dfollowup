import type { ReportResult } from "@/lib/ado/report";
import { getExecutiveVelocity } from "@/lib/ado/executiveVelocity";
import { groupRoadmapBySelectedAreas } from "@/lib/ado/roadmapGroups";
import {
  analyticsBlock,
  areasShort,
  DELIVERY_MEETING_NO_DATA_PT,
  formatMeetingDatePt,
  isClosedLikeState,
  metaLine,
  pct,
  sprintLine,
} from "@/lib/deliveryMeetingPptxShared";

/** Evita quebras em runs OOXML ao substituir texto no .pptx. */
export function escapeForPptxTextRun(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function overdueByAreaTsv(report: ReportResult): string {
  const lines = ["Área (filtro)\tAtrasadas"];
  for (const o of report.analytics.overdueByArea.slice(0, 10)) {
    const ap = o.areaPath.length > 120 ? `${o.areaPath.slice(0, 118)}…` : o.areaPath;
    lines.push(`${ap.replace(/\t/g, " ")}\t${o.overdue}`);
  }
  return lines.join("\n");
}

function byAreaSummaryTsv(report: ReportResult): string {
  const lines = ["Area Path\tTot\tCl\t%"];
  for (const a of report.byArea.slice(0, 10)) {
    const ap = a.areaPath.length > 80 ? `${a.areaPath.slice(0, 78)}…` : a.areaPath;
    lines.push(`${ap.replace(/\t/g, " ")}\t${a.total}\t${a.closed}\t${pct(a.completionRate)}`);
  }
  return lines.join("\n");
}

function roadmapPlainText(report: ReportResult): string {
  const groups = groupRoadmapBySelectedAreas(report.roadmap, report.filter.areaPaths);
  const out: string[] = [];
  let rowBudget = 12;
  for (const g of groups) {
    if (rowBudget <= 0) break;
    out.push(`\n${g.areaPath} (${g.rows.length} itens)`);
    const take = Math.min(g.rows.length, Math.min(5, rowBudget));
    if (take === 0) {
      out.push("  (Nenhum work item neste agrupamento.)");
      rowBudget -= 1;
      continue;
    }
    out.push("  ID\tTipo\tEstado\t%\tTarget\tTítulo");
    for (const r of g.rows.slice(0, take)) {
      const tit = (r.title || "").length > 60 ? `${(r.title || "").slice(0, 58)}…` : r.title || "";
      out.push(
        [
          String(r.id),
          r.workItemType.length > 14 ? `${r.workItemType.slice(0, 12)}…` : r.workItemType,
          r.state.length > 14 ? `${r.state.slice(0, 12)}…` : r.state,
          r.progressPercent == null ? "" : String(r.progressPercent),
          r.targetDate.length > 12 ? r.targetDate.slice(0, 12) : r.targetDate,
          tit.replace(/\t/g, " ").replace(/\n/g, " "),
        ].join("\t"),
      );
    }
    rowBudget -= take + 1;
    if (g.rows.length > take) {
      out.push(`  + ${g.rows.length - take} itens (ver app).`);
    }
  }
  if (groups.length === 0) out.push("Sem grupos.");
  return out.join("\n").trim();
}

function closedItemsTsv(report: ReportResult): string {
  const closed = report.roadmap.filter((r) => isClosedLikeState(r.state)).slice(0, 14);
  if (closed.length === 0) return "Nenhum item fechado neste recorte.";
  const lines = ["ID\tTipo\tEstado\tTarget\tTítulo"];
  for (const r of closed) {
    lines.push(
      [
        String(r.id),
        r.workItemType.slice(0, 14),
        r.state.slice(0, 14),
        (r.targetDate || "").slice(0, 12),
        (r.title.length > 50 ? `${r.title.slice(0, 48)}…` : r.title).replace(/\t/g, " "),
      ].join("\t"),
    );
  }
  return lines.join("\n");
}

function openItemsTsv(report: ReportResult): string {
  const open = report.roadmap.filter((r) => !isClosedLikeState(r.state)).slice(0, 14);
  if (open.length === 0) return "Nenhum item aberto neste recorte.";
  const lines = ["ID\tTipo\tEstado\tTarget\tTítulo"];
  for (const r of open) {
    lines.push(
      [
        String(r.id),
        r.workItemType.slice(0, 14),
        r.state.slice(0, 14),
        (r.targetDate || "").slice(0, 12),
        (r.title.length > 50 ? `${r.title.slice(0, 48)}…` : r.title).replace(/\t/g, " "),
      ].join("\t"),
    );
  }
  return lines.join("\n");
}

function dashboardConsolidatedLines(report: ReportResult): string {
  const c = report.consolidated;
  const vel = getExecutiveVelocity(report);
  return [
    `TOTAL: ${c.total}`,
    `Closed: ${c.closed} · Active: ${c.active} · New: ${c.new}`,
    `Atrasadas: ${c.overdue} · Features (escopo): ${c.featureTotal}`,
    `Taxa conclusão: ${pct(c.completionRate)}`,
    `Velocity: ${vel.headline} — ${vel.detail}`,
  ].join("\n");
}

function recapPendingBody(report: ReportResult): string {
  return [
    `Projecto: ${report.filter.project}`,
    `Tipos: ${report.filter.workItemTypes.join(", ")}`,
    `Recorte temporal: ${sprintLine(report.filter)}`,
    "",
    "Area Paths (raiz):",
    ...report.filter.areaPaths.map((p) => `• ${p.length > 90 ? `${p.slice(0, 88)}…` : p}`),
  ].join("\n");
}

/**
 * Chaves = token dentro de `{{...}}` no PowerPoint (ex.: DF_PROJECT para `{{DF_PROJECT}}`).
 * Valores já escapados para substituição em OOXML.
 */
export function buildDeliveryMeetingPlaceholderMap(
  report: ReportResult | null,
  meetingDate: Date,
): Record<string, string> {
  const dateStr = formatMeetingDatePt(meetingDate);
  const raw: Record<string, string> = {
    DF_CAPA_TITLE: "Delivery Follow-up",
    DF_DATE_PT: dateStr,
    DF_BRAND_FOOTER: "Thomson Reuters",
    DF_META_LINE: metaLine(report),
    DF_NO_DATA: DELIVERY_MEETING_NO_DATA_PT,
  };

  if (!report) {
    raw.DF_CAPA_PROJECT = "";
    raw.DF_CAPA_SPRINT = "";
    raw.DF_CAPA_AREAS = "";
    raw.DF_ANALYTICS_BLOCK = DELIVERY_MEETING_NO_DATA_PT;
    raw.DF_RECAP_ISSUES_BODY = DELIVERY_MEETING_NO_DATA_PT;
    raw.DF_RECAP_PENDING_BODY = DELIVERY_MEETING_NO_DATA_PT;
    raw.DF_ISSUES_BLOCKED_LINE = "";
    raw.DF_ISSUES_OVERDUE_TSV = "";
    raw.DF_ISSUES_ANALYTICS_FOOTER = "";
    raw.DF_ROADMAP_INTRO =
      "Agrupado por cada Area Path do filtro (primeiro grupo em que o item encaixa), igual ao separador Roadmap da aplicação.";
    raw.DF_ROADMAP_BODY = DELIVERY_MEETING_NO_DATA_PT;
    raw.DF_DASHBOARD_LINES = DELIVERY_MEETING_NO_DATA_PT;
    raw.DF_DASHBOARD_BY_AREA_TSV = "";
    raw.DF_CLOSED_TSV = DELIVERY_MEETING_NO_DATA_PT;
    raw.DF_OPEN_TSV = DELIVERY_MEETING_NO_DATA_PT;
    raw.DF_THANK_YOU_PROJECT = "";
    raw.DF_TIER_SECTION_ANALYTICS = DELIVERY_MEETING_NO_DATA_PT;
  } else {
    raw.DF_CAPA_PROJECT = report.filter.project;
    raw.DF_CAPA_SPRINT = sprintLine(report.filter);
    raw.DF_CAPA_AREAS = `Áreas (raiz WIQL): ${areasShort(report.filter, 3)}`;
    raw.DF_ANALYTICS_BLOCK = analyticsBlock(report);
    raw.DF_RECAP_ISSUES_BODY =
      "Preencher na reunião (owners e prazos).\n\nResumo quantitativo do recorte ADO:\n\n" + analyticsBlock(report);
    raw.DF_RECAP_PENDING_BODY = recapPendingBody(report);
    raw.DF_ISSUES_BLOCKED_LINE = `Bloqueios (heurística): ${report.analytics.blockedOrImpedimentLike}`;
    raw.DF_ISSUES_OVERDUE_TSV = overdueByAreaTsv(report);
    raw.DF_ISSUES_ANALYTICS_FOOTER = analyticsBlock(report);
    raw.DF_ROADMAP_INTRO =
      "Agrupado por cada Area Path do filtro (primeiro grupo em que o item encaixa), igual ao separador Roadmap da aplicação.";
    raw.DF_ROADMAP_BODY = roadmapPlainText(report);
    raw.DF_DASHBOARD_LINES = dashboardConsolidatedLines(report);
    raw.DF_DASHBOARD_BY_AREA_TSV = byAreaSummaryTsv(report);
    raw.DF_CLOSED_TSV = closedItemsTsv(report);
    raw.DF_OPEN_TSV = openItemsTsv(report);
    raw.DF_THANK_YOU_PROJECT = report.filter.project;
    raw.DF_TIER_SECTION_ANALYTICS = analyticsBlock(report);
  }

  const escaped: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    escaped[k] = escapeForPptxTextRun(v);
  }
  return escaped;
}
