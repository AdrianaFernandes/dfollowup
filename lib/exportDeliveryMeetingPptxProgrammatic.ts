import pptxgen from "pptxgenjs";
import type { ReportResult } from "@/lib/ado/report";
import { getExecutiveVelocity } from "@/lib/ado/executiveVelocity";
import { deliveryPptxTheme as T } from "@/lib/deliveryPptxTheme";
import type { DeliveryMeetingDeckInput } from "@/lib/deliveryMeetingDeckInput";
import { buildDeliveryMeetingPlaceholderMap } from "@/lib/deliveryMeetingPptxData";

/** Alinhamento horizontal para células PptxGenJS (evita inferência `string`). */
const CENTER = "center" as const;

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function cellText(s: string): string {
  return s.replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

function chunkLines(body: string, maxLines: number): string[] {
  const lines = body.split("\n");
  if (lines.length === 0) return [""];
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines).join("\n"));
  }
  return chunks;
}

type PptxSlide = ReturnType<InstanceType<typeof pptxgen>["addSlide"]>;

function addSlideTitle(slide: PptxSlide, title: string) {
  slide.addShape("rect", {
    x: T.marginX,
    y: T.marginY,
    w: 0.08,
    h: 0.55,
    fill: { color: T.accentOrange },
    line: { width: 0 },
  });
  slide.addText(title, {
    x: T.marginX + 0.15,
    y: T.marginY,
    w: T.contentW,
    h: 0.55,
    fontSize: T.titleFontSize,
    bold: true,
    color: T.titleGreen,
    fontFace: T.bodyFontFace,
  });
}

export async function buildDeliveryMeetingPptxProgrammatic(
  report: ReportResult,
  deckInput?: DeliveryMeetingDeckInput | null,
): Promise<Buffer> {
  const map = buildDeliveryMeetingPlaceholderMap(report, deckInput ?? null);
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "DFollowup";
  pptx.title = map.DF_CAPA_TITLE || "Delivery Follow-up";
  pptx.subject = map.DF_META_LINE;

  const slideH = 5.625;
  const bodyTop = T.marginY + 0.75;
  const bodyH = slideH - bodyTop - 0.55;

  // --- Capa ---
  const sCover = pptx.addSlide();
  sCover.background = { color: T.slideBg };
  sCover.addText(map.DF_CAPA_TITLE, {
    x: T.marginX,
    y: 1.1,
    w: T.contentW,
    h: 0.9,
    fontSize: 32,
    bold: true,
    color: T.titleGreen,
    fontFace: T.bodyFontFace,
  });
  sCover.addText(
    [
      { text: map.DF_CAPA_PROJECT || "—", options: { fontSize: T.subtitleFontSize, bold: true, color: T.bodyText } },
      { text: "\n", options: {} },
      { text: map.DF_CAPA_SPRINT, options: { fontSize: T.bodyFontSize, color: T.mutedText } },
      { text: "\n", options: {} },
      { text: map.DF_CAPA_AREAS, options: { fontSize: T.bodyFontSize, color: T.mutedText } },
      { text: "\n\n", options: {} },
      { text: map.DF_DATE_PT, options: { fontSize: T.bodyFontSize, color: T.mutedText } },
      { text: "\n", options: {} },
      { text: map.DF_META_LINE, options: { fontSize: T.smallFontSize, color: T.mutedText } },
    ],
    { x: T.marginX, y: 2.15, w: T.contentW, h: 2.8, valign: "top" },
  );
  sCover.addText(map.DF_BRAND_FOOTER, {
    x: T.marginX,
    y: slideH - 0.55,
    w: T.contentW,
    h: 0.35,
    fontSize: T.smallFontSize,
    color: T.mutedText,
  });

  // --- KPIs (espelho ExecutiveSummaryKpis + barra) ---
  const c = report.consolidated;
  const vel = getExecutiveVelocity(report);
  const barW = Math.min(100, Math.max(0, c.completionRate * 100));
  const sKpi = pptx.addSlide();
  sKpi.background = { color: T.slideBg };
  addSlideTitle(sKpi, "KPIs");
  const kpiY = bodyTop;
  sKpi.addTable(
    [
      [
        { text: String(c.total), options: { bold: true, fontSize: 22, color: T.titleGreen, align: CENTER } },
        { text: String(c.closed), options: { bold: true, fontSize: 22, color: T.titleGreen, align: CENTER } },
        { text: String(c.active), options: { bold: true, fontSize: 22, color: T.titleGreen, align: CENTER } },
        { text: String(c.new), options: { bold: true, fontSize: 22, color: T.titleGreen, align: CENTER } },
      ],
      [
        { text: "TOTAL", options: { fontSize: T.smallFontSize, color: T.mutedText, align: CENTER } },
        { text: "CLOSED", options: { fontSize: T.smallFontSize, color: T.mutedText, align: CENTER } },
        { text: "ACTIVE", options: { fontSize: T.smallFontSize, color: T.mutedText, align: CENTER } },
        { text: "NEW", options: { fontSize: T.smallFontSize, color: T.mutedText, align: CENTER } },
      ],
    ],
    {
      x: T.marginX,
      y: kpiY,
      w: T.contentW,
      colW: [2.2, 2.2, 2.2, 2.2],
      border: { type: "none" },
      fill: { color: T.slideBg },
    },
  );
  const row2Y = kpiY + 1.35;
  sKpi.addText("% conclusão", { x: T.marginX, y: row2Y, w: 2.5, h: 0.25, fontSize: T.smallFontSize, color: T.mutedText });
  sKpi.addText(pct(c.completionRate), {
    x: T.marginX,
    y: row2Y + 0.28,
    w: 2.5,
    h: 0.45,
    fontSize: 20,
    bold: true,
    color: T.titleGreen,
  });
  const trackX = T.marginX;
  const trackY = row2Y + 0.78;
  const trackW = 3.8;
  const trackH = 0.14;
  sKpi.addShape("rect", {
    x: trackX,
    y: trackY,
    w: trackW,
    h: trackH,
    fill: { color: T.trackFill },
    line: { width: 0 },
  });
  sKpi.addShape("rect", {
    x: trackX,
    y: trackY,
    w: (trackW * barW) / 100,
    h: trackH,
    fill: { color: T.accentOrange },
    line: { width: 0 },
  });
  const velX = T.marginX + 4.35;
  sKpi.addText("Velocity", { x: velX, y: row2Y, w: 4.2, h: 0.25, fontSize: T.smallFontSize, color: T.mutedText });
  sKpi.addText(vel.headline, {
    x: velX,
    y: row2Y + 0.28,
    w: 4.2,
    h: 0.45,
    fontSize: 20,
    bold: true,
    color: T.titleGreen,
  });
  sKpi.addText(vel.detail, {
    x: velX,
    y: row2Y + 0.72,
    w: 4.2,
    h: 0.55,
    fontSize: T.smallFontSize,
    color: T.mutedText,
    wrap: true,
  });

  // --- Consolidado (texto alinhado a DF_DASHBOARD_LINES + recap) ---
  const sCons = pptx.addSlide();
  sCons.background = { color: T.slideBg };
  addSlideTitle(sCons, "Consolidado");
  sCons.addText(`${map.DF_DASHBOARD_LINES}\n\n${map.DF_RECAP_PENDING_BODY}`, {
    x: T.marginX,
    y: bodyTop,
    w: T.contentW,
    h: bodyH,
    fontSize: T.bodyFontSize,
    color: T.bodyText,
    fontFace: T.bodyFontFace,
    valign: "top",
    wrap: true,
  });

  // --- Por área (tabela) ---
  const sArea = pptx.addSlide();
  sArea.background = { color: T.slideBg };
  addSlideTitle(sArea, "Consolidado — por área");
  const areaHeader = [
    { text: "Área", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
    { text: "Tot", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen, align: CENTER } },
    { text: "Cls", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen, align: CENTER } },
    { text: "Act", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen, align: CENTER } },
    { text: "New", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen, align: CENTER } },
    { text: "Atr", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen, align: CENTER } },
    { text: "Feat", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen, align: CENTER } },
    { text: "%", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen, align: CENTER } },
  ];
  const areaRows = report.byArea.map((a) => [
    { text: cellText(a.areaPath), options: { fontSize: T.smallFontSize } },
    { text: String(a.total), options: { align: CENTER, fontSize: T.smallFontSize } },
    { text: String(a.closed), options: { align: CENTER, fontSize: T.smallFontSize } },
    { text: String(a.active), options: { align: CENTER, fontSize: T.smallFontSize } },
    { text: String(a.new), options: { align: CENTER, fontSize: T.smallFontSize } },
    { text: String(a.overdue), options: { align: CENTER, fontSize: T.smallFontSize } },
    { text: String(a.featureTotal), options: { align: CENTER, fontSize: T.smallFontSize } },
    { text: pct(a.completionRate), options: { align: CENTER, fontSize: T.smallFontSize } },
  ]);
  sArea.addTable([areaHeader, ...areaRows], {
    x: T.marginX,
    y: bodyTop,
    w: T.contentW,
    colW: [3.1, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.9],
    fontSize: T.smallFontSize,
    border: { color: T.tableHeaderBorder, pt: 0.5 },
    autoPage: true,
  });

  // --- Roadmap (corpo partido; intro na primeira slide) ---
  const roadmapChunks = chunkLines(map.DF_ROADMAP_BODY, 28);
  for (let i = 0; i < roadmapChunks.length; i++) {
    const sRm = pptx.addSlide();
    sRm.background = { color: T.slideBg };
    addSlideTitle(sRm, i === 0 ? "Roadmap" : `Roadmap (cont.)`);
    const intro = i === 0 ? `${map.DF_ROADMAP_INTRO}\n\n` : "";
    sRm.addText(intro + roadmapChunks[i], {
      x: T.marginX,
      y: bodyTop,
      w: T.contentW,
      h: bodyH,
      fontSize: T.smallFontSize,
      fontFace: "Courier New",
      color: T.bodyText,
      valign: "top",
      wrap: true,
    });
  }

  // --- Listas closed / open (TSV do mapa) ---
  const sClosed = pptx.addSlide();
  sClosed.background = { color: T.slideBg };
  addSlideTitle(sClosed, "Roadmap — Closed");
  sClosed.addText(map.DF_CLOSED_TSV || "(sem itens closed no recorte)", {
    x: T.marginX,
    y: bodyTop,
    w: T.contentW,
    h: bodyH,
    fontSize: 8,
    fontFace: "Courier New",
    color: T.bodyText,
    valign: "top",
    wrap: true,
  });

  const sOpen = pptx.addSlide();
  sOpen.background = { color: T.slideBg };
  addSlideTitle(sOpen, "Roadmap — New / Active");
  sOpen.addText(map.DF_OPEN_TSV || "(sem itens new/active no recorte)", {
    x: T.marginX,
    y: bodyTop,
    w: T.contentW,
    h: bodyH,
    fontSize: 8,
    fontFace: "Courier New",
    color: T.bodyText,
    valign: "top",
    wrap: true,
  });

  // --- Análise e métricas ---
  const sAn1 = pptx.addSlide();
  sAn1.background = { color: T.slideBg };
  addSlideTitle(sAn1, "Análise e métricas");
  sAn1.addText(map.DF_ANALYTICS_BLOCK, {
    x: T.marginX,
    y: bodyTop,
    w: T.contentW,
    h: bodyH,
    fontSize: T.bodyFontSize,
    color: T.bodyText,
    valign: "top",
    wrap: true,
  });

  const sAn2 = pptx.addSlide();
  sAn2.background = { color: T.slideBg };
  addSlideTitle(sAn2, "Análise — mix, tags, atrasos");
  const issuesBlock = [
    map.DF_TIER_SECTION_ANALYTICS,
    "",
    map.DF_ISSUES_BLOCKED_LINE,
    "",
    map.DF_ISSUES_OVERDUE_TSV || "(sem atrasos por área)",
    "",
    map.DF_ISSUES_ANALYTICS_FOOTER,
  ].join("\n");
  sAn2.addText(issuesBlock, {
    x: T.marginX,
    y: bodyTop,
    w: T.contentW,
    h: bodyH * 0.62,
    fontSize: T.bodyFontSize,
    color: T.bodyText,
    valign: "top",
    wrap: true,
  });
  const aging = report.analytics.agingTop
    .map((it) => `${it.id}\t${it.daysOpen}d\t${cellText(it.title).slice(0, 80)}`)
    .join("\n");
  sAn2.addText(`Top aging (abertos)\n${aging || "(sem amostra)"}`, {
    x: T.marginX,
    y: bodyTop + bodyH * 0.64,
    w: T.contentW,
    h: bodyH * 0.34,
    fontSize: T.smallFontSize,
    fontFace: "Courier New",
    valign: "top",
    wrap: true,
  });

  // --- Pendências ---
  const sPend = pptx.addSlide();
  sPend.background = { color: T.slideBg };
  addSlideTitle(sPend, "Pendências (última reunião)");
  const pend = deckInput?.pendencias ?? [];
  if (pend.length === 0) {
    sPend.addText(map.DF_UI_LAST_MEETING_PENDING || "(sem linhas)", {
      x: T.marginX,
      y: bodyTop,
      w: T.contentW,
      h: bodyH,
      fontSize: T.bodyFontSize,
      color: T.mutedText,
      valign: "top",
      wrap: true,
    });
  } else {
    const pendHeader = [
      { text: "Pendência", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Owner", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Status", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Observação", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
    ];
    const pendRows = pend.map((r) => [
      { text: cellText(r.pendencia), options: { fontSize: T.smallFontSize } },
      { text: cellText(r.owner), options: { fontSize: T.smallFontSize } },
      { text: cellText(r.status), options: { fontSize: T.smallFontSize } },
      { text: cellText(r.observacao), options: { fontSize: T.smallFontSize } },
    ]);
    sPend.addTable([pendHeader, ...pendRows], {
      x: T.marginX,
      y: bodyTop,
      w: T.contentW,
      colW: [3.4, 1.2, 1.1, 3.1],
      fontSize: T.smallFontSize,
      border: { color: T.tableHeaderBorder, pt: 0.5 },
      autoPage: true,
    });
  }

  // --- Riscos ---
  const sRisk = pptx.addSlide();
  sRisk.background = { color: T.slideBg };
  addSlideTitle(sRisk, "Riscos e plano de acção");
  const risks = deckInput?.riscos ?? [];
  if (risks.length === 0) {
    sRisk.addText(map.DF_UI_RISKS_ACTION_PLAN || "(sem linhas)", {
      x: T.marginX,
      y: bodyTop,
      w: T.contentW,
      h: bodyH,
      fontSize: T.bodyFontSize,
      color: T.mutedText,
      valign: "top",
      wrap: true,
    });
  } else {
    const rh = [
      { text: "Sev", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Risco", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Área", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Plano", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Owner", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
      { text: "Prazo", options: { bold: true, fill: { color: T.tableHeaderFill }, color: T.titleGreen } },
    ];
    const rr = risks.map((r) => [
      { text: cellText(r.sev), options: { fontSize: 8 } },
      { text: cellText(r.risco), options: { fontSize: 8 } },
      { text: cellText(r.areaAfetada), options: { fontSize: 8 } },
      { text: cellText(r.planoAcao), options: { fontSize: 8 } },
      { text: cellText(r.owner), options: { fontSize: 8 } },
      { text: cellText(r.prazo), options: { fontSize: 8 } },
    ]);
    sRisk.addTable([rh, ...rr], {
      x: T.marginX,
      y: bodyTop,
      w: T.contentW,
      colW: [0.55, 2.35, 1.55, 2.35, 0.95, 0.85],
      fontSize: 8,
      border: { color: T.tableHeaderBorder, pt: 0.5 },
      autoPage: true,
    });
  }

  if (report.warnings.length > 0) {
    const sW = pptx.addSlide();
    sW.background = { color: T.slideBg };
    addSlideTitle(sW, "Avisos do relatório");
    sW.addText(report.warnings.join("\n"), {
      x: T.marginX,
      y: bodyTop,
      w: T.contentW,
      h: bodyH,
      fontSize: T.bodyFontSize,
      color: "C41E3A",
      valign: "top",
      wrap: true,
    });
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
