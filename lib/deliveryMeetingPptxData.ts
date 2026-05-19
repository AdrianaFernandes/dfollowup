import type { ReportFilterInput } from "@/lib/ado/filters";
import type { ReportResult, RoadmapRow } from "@/lib/ado/report";
import { groupRoadmapBySelectedAreas } from "@/lib/ado/roadmapGroups";
import { getExecutiveVelocity } from "@/lib/ado/executiveVelocity";

/**
 * Chaves = token dentro de `{{...}}` no PowerPoint (ex.: DF_PROJECT → substituir `{{DF_PROJECT}}`).
 * Valores são texto simples (sem OOXML); quebras de linha são permitidas.
 */
export type DeliveryMeetingPlaceholderMap = Record<string, string>;

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function filterRecapLine(filter: ReportFilterInput): string {
  if (filter.dateMode === "iteration") {
    const n = filter.iterationPaths?.length ?? 0;
    return `Iteration: ${n} path(s) · Tipos: ${filter.workItemTypes.join(", ")}`;
  }
  return `Target Date: ${filter.targetDateStart ?? ""} → ${filter.targetDateEnd ?? ""} · Tipos: ${filter.workItemTypes.join(", ")}`;
}

function areasSummary(filter: ReportFilterInput): string {
  const roots = filter.areaPaths ?? [];
  if (!roots.length) return "(nenhuma raiz Area Path)";
  return roots.length <= 4
    ? roots.join(" · ")
    : `${roots.slice(0, 3).join(" · ")} · +${roots.length - 3}`;
}

function roadmapBody(report: ReportResult): string {
  const groups = groupRoadmapBySelectedAreas(report.roadmap, report.filter.areaPaths ?? []);
  const lines: string[] = [];
  for (const g of groups) {
    lines.push(`— ${g.areaPath} (${g.rows.length})`);
    const tsv = g.rows
      .slice(0, 40)
      .map((r) => [r.id, r.workItemType, r.state, r.targetDate, r.title.replace(/\s+/g, " ")].join("\t"));
    if (tsv.length) lines.push(tsv.join("\n"));
    if (g.rows.length > 40) lines.push(`… +${g.rows.length - 40} itens`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function roadmapIntro(report: ReportResult): string {
  const n = report.roadmap.length;
  return n === 0
    ? "Sem itens no roadmap para este recorte."
    : `Roadmap com ${n} work item(s), agrupado pelas raízes do filtro.`;
}

function closedOpenTsv(rows: RoadmapRow[], bucket: "closed" | "new" | "active"): string {
  const filtered = rows.filter((r) => r.stateBucket === bucket);
  if (!filtered.length) return "";
  return filtered
    .slice(0, 60)
    .map((r) => [r.id, r.workItemType, r.state, r.areaPath, r.title.replace(/\s+/g, " ")].join("\t"))
    .join("\n");
}

function overdueTsv(report: ReportResult): string {
  const rows = report.analytics.overdueByArea.filter((r) => r.overdue > 0);
  if (!rows.length) return "";
  return rows.map((r) => `${r.areaPath}\t${r.overdue}`).join("\n");
}

function dashboardByAreaTsv(report: ReportResult): string {
  return report.byArea
    .map(
      (a) =>
        `${a.areaPath}\t${a.total}\t${a.closed}\t${a.active}\t${a.new}\t${a.overdue}\t${a.featureTotal}\t${pct(a.completionRate)}`,
    )
    .join("\n");
}

function analyticsBlock(report: ReportResult): string {
  const c = report.consolidated;
  const a = report.analytics;
  const vel = getExecutiveVelocity(report);
  const lines = [
    `Total ${c.total} · Closed ${c.closed} · Active ${c.active} · New ${c.new} · Atrasadas ${c.overdue}`,
    `% conclusão ${pct(c.completionRate)} · Eficiência ${c.efficiencyRate == null ? "N/D" : pct(c.efficiencyRate)} (${c.efficiencyLabel})`,
    `Velocity: ${vel.headline} — ${vel.detail}`,
    `Throughput (closed): ${a.throughputClosed}`,
    `Lead time mediana (d): ${a.leadTimeDays.median ?? "N/D"} · Cycle time mediana (d): ${a.cycleTimeDays.median ?? "N/D"}`,
    `WIP: new ${a.wip.new} · active ${a.wip.active} · total ${a.wip.total}`,
    `Bloqueio / impedimento (heur.): ${a.blockedOrImpedimentLike}`,
  ];
  if (a.notes.length) lines.push(...a.notes.map((n) => `Nota: ${n}`));
  return lines.join("\n");
}

function tierSectionAnalytics(report: ReportResult): string {
  const a = report.analytics;
  const mix = a.mixByType
    .slice(0, 8)
    .map((m) => `${m.workItemType}: ${m.count} (${pct(m.pct)})`)
    .join(" · ");
  const tags = a.topTags
    .slice(0, 8)
    .map((t) => `${t.tag}: ${t.count}`)
    .join(" · ");
  return [mix || "(sem mix por tipo)", tags || "(sem tags)"].join("\n");
}

/** Mapa de placeholders para o modelo .pptx (marcadores `{{DF_*}}`). */
export function buildDeliveryMeetingPlaceholderMap(report: ReportResult | null): DeliveryMeetingPlaceholderMap {
  const empty = (keys: string[]) =>
    Object.fromEntries(keys.map((k) => [k, ""])) as DeliveryMeetingPlaceholderMap;

  const allKeys = [
    "DF_CAPA_TITLE",
    "DF_CAPA_PROJECT",
    "DF_CAPA_SPRINT",
    "DF_CAPA_AREAS",
    "DF_DATE_PT",
    "DF_BRAND_FOOTER",
    "DF_META_LINE",
    "DF_NO_DATA",
    "DF_ANALYTICS_BLOCK",
    "DF_RECAP_ISSUES_BODY",
    "DF_RECAP_PENDING_BODY",
    "DF_ISSUES_BLOCKED_LINE",
    "DF_ISSUES_OVERDUE_TSV",
    "DF_ISSUES_ANALYTICS_FOOTER",
    "DF_ROADMAP_INTRO",
    "DF_ROADMAP_BODY",
    "DF_DASHBOARD_LINES",
    "DF_DASHBOARD_BY_AREA_TSV",
    "DF_CLOSED_TSV",
    "DF_OPEN_TSV",
    "DF_THANK_YOU_PROJECT",
    "DF_TIER_SECTION_ANALYTICS",
  ] as const;

  if (!report) {
    return empty([...allKeys]);
  }

  const f = report.filter;
  const proj = f.project?.trim() || "";
  const datePt = new Date().toLocaleDateString("pt-PT", { dateStyle: "long" });
  const meta = `${proj || "Projeto"} · ${filterRecapLine(f)}`;

  return {
    DF_CAPA_TITLE: "Delivery Follow-up",
    DF_CAPA_PROJECT: proj,
    DF_CAPA_SPRINT:
      f.dateMode === "iteration"
        ? `Iteration: ${f.iterationPaths?.length ?? 0} path(s)`
        : `Target Date: ${f.targetDateStart ?? ""} → ${f.targetDateEnd ?? ""}`,
    DF_CAPA_AREAS: areasSummary(f),
    DF_DATE_PT: datePt,
    DF_BRAND_FOOTER: "Thomson Reuters",
    DF_META_LINE: meta,
    DF_NO_DATA: "",
    DF_ANALYTICS_BLOCK: analyticsBlock(report),
    DF_RECAP_ISSUES_BODY: [analyticsBlock(report), `Bloqueios / impedimentos (heur.): ${report.analytics.blockedOrImpedimentLike}`].join(
      "\n\n",
    ),
    DF_RECAP_PENDING_BODY: [filterRecapLine(f), `Áreas WIQL: ${areasSummary(f)}`].join("\n"),
    DF_ISSUES_BLOCKED_LINE: `Itens com sinais de bloqueio/impedimento (heurística): ${report.analytics.blockedOrImpedimentLike}`,
    DF_ISSUES_OVERDUE_TSV: overdueTsv(report),
    DF_ISSUES_ANALYTICS_FOOTER: `Atraso por área (count). WIP total ${report.analytics.wip.total}.`,
    DF_ROADMAP_INTRO: roadmapIntro(report),
    DF_ROADMAP_BODY: roadmapBody(report),
    DF_DASHBOARD_LINES: (() => {
      const vel = getExecutiveVelocity(report);
      return [
        `Consolidado: Total ${report.consolidated.total} · Closed ${report.consolidated.closed} · Active ${report.consolidated.active} · New ${report.consolidated.new}`,
        `% conclusão ${pct(report.consolidated.completionRate)} · Features ${report.consolidated.featureTotal}`,
        `${vel.headline} — ${vel.detail}`,
      ].join("\n");
    })(),
    DF_DASHBOARD_BY_AREA_TSV: dashboardByAreaTsv(report),
    DF_CLOSED_TSV: closedOpenTsv(report.roadmap, "closed"),
    DF_OPEN_TSV: [
      closedOpenTsv(report.roadmap, "new"),
      closedOpenTsv(report.roadmap, "active"),
    ]
      .filter(Boolean)
      .join("\n"),
    DF_THANK_YOU_PROJECT: proj || "Delivery Follow-up",
    DF_TIER_SECTION_ANALYTICS: tierSectionAnalytics(report),
  };
}

/** Lista para `modify.replaceText([...])` do pptx-automizer. */
export function buildDeliveryMeetingReplaceTextSpecs(map: DeliveryMeetingPlaceholderMap) {
  return Object.entries(map).map(([replace, text]) => ({
    replace,
    by: { text: text ?? "" },
  }));
}
