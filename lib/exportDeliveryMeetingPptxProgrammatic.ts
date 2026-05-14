"use client";

import PptxGenJS from "pptxgenjs";
import type { ReportResult } from "@/lib/ado/report";
import { getExecutiveVelocity } from "@/lib/ado/executiveVelocity";
import { groupRoadmapBySelectedAreas } from "@/lib/ado/roadmapGroups";
import {
  addCoverDecor,
  addGreenTitleBand,
  addSectionEyebrow,
  configureDeliveryDeck,
  CONTENT_TOP,
  tableHeaderCell,
  templateFooter,
  TR,
} from "@/lib/deliveryPptxBranding";
import {
  analyticsBlock,
  areasShort,
  DELIVERY_MEETING_NO_DATA_PT,
  formatMeetingDatePt,
  isClosedLikeState,
  metaLine,
  pct,
  safeFilenamePart,
  sprintLine,
} from "@/lib/deliveryMeetingPptxShared";

export async function downloadDeliveryMeetingPptxProgrammatic(
  report: ReportResult | null,
  options?: { filename?: string; meetingDate?: Date },
) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  configureDeliveryDeck(pptx);

  const when = options?.meetingDate ?? new Date();
  const dateStr = formatMeetingDatePt(when);
  const noData = DELIVERY_MEETING_NO_DATA_PT;

  const s1 = pptx.addSlide();
  addCoverDecor(pptx, s1);
  s1.addText("Delivery Follow-up", {
    x: 1.85,
    y: 2.55,
    w: 9.6,
    h: 0.85,
    fontSize: 40,
    bold: true,
    color: TR.ink,
    align: "center",
    fontFace: "Calibri Light",
  });
  if (report) {
    s1.addText(report.filter.project, {
      x: 1.85,
      y: 3.45,
      w: 9.6,
      fontSize: 14,
      color: TR.muted,
      align: "center",
      fontFace: "Calibri",
    });
    s1.addText(sprintLine(report.filter), {
      x: 1.85,
      y: 3.78,
      w: 9.6,
      fontSize: 14,
      color: TR.muted,
      align: "center",
      fontFace: "Calibri",
    });
    s1.addText(`Áreas (raiz WIQL): ${areasShort(report.filter, 3)}`, {
      x: 1.2,
      y: 4.18,
      w: 11,
      fontSize: 10,
      color: TR.muted,
      align: "center",
      fontFace: "Calibri",
    });
  } else {
    s1.addText(noData, {
      x: 1.85,
      y: 3.45,
      w: 9.6,
      fontSize: 12,
      color: TR.muted,
      align: "center",
      fontFace: "Calibri",
    });
  }
  s1.addText(dateStr, {
    x: 1.85,
    y: 4.95,
    w: 9.6,
    fontSize: 14,
    color: TR.muted,
    align: "center",
    fontFace: "Calibri",
  });
  s1.addText("Thomson Reuters", {
    x: 9.55,
    y: 6.55,
    w: 3.5,
    fontSize: 10,
    color: TR.footerGrey,
    align: "right",
    fontFace: "Calibri",
  });

  const tierC = (title: string, subtitle: string) => {
    const sl = pptx.addSlide();
    addGreenTitleBand(pptx, sl, { title, meta: subtitle });
    if (report) {
      sl.addText(analyticsBlock(report), {
        x: 0.5,
        y: CONTENT_TOP + 0.06,
        fontSize: 11,
        w: 12.2,
        valign: "top",
        h: 5.45,
        color: TR.ink,
        fontFace: "Calibri",
      });
    } else {
      sl.addText(noData, {
        x: 0.5,
        y: CONTENT_TOP + 0.15,
        fontSize: 12,
        color: TR.footerGrey,
        w: 12.2,
        fontFace: "Calibri",
      });
    }
    templateFooter(sl);
  };

  const s2 = pptx.addSlide();
  addGreenTitleBand(pptx, s2, {
    title: "Recap & Issues & Action Plan",
    meta: report ? metaLine(report) : undefined,
  });
  addSectionEyebrow(s2, "PENDÊNCIAS / RECAP", CONTENT_TOP + 0.06);
  if (report) {
    s2.addText(
      "Preencher na reunião (owners e prazos).\n\nResumo quantitativo do recorte ADO:\n\n" + analyticsBlock(report),
      {
        x: 0.5,
        y: CONTENT_TOP + 0.42,
        fontSize: 10.5,
        w: 12.2,
        valign: "top",
        h: 5.35,
        color: TR.ink,
        fontFace: "Calibri",
      },
    );
  } else {
    s2.addText(noData, {
      x: 0.5,
      y: CONTENT_TOP + 0.42,
      fontSize: 12,
      w: 12.2,
      color: TR.muted,
      fontFace: "Calibri",
    });
  }
  templateFooter(s2);

  const s3 = pptx.addSlide();
  addGreenTitleBand(pptx, s3, { title: "Recap / Pending", meta: report ? metaLine(report) : undefined });
  if (report) {
    s3.addText(
      [
        `Projecto: ${report.filter.project}`,
        `Tipos: ${report.filter.workItemTypes.join(", ")}`,
        `Recorte temporal: ${sprintLine(report.filter)}`,
        "",
        "Area Paths (raiz):",
        ...report.filter.areaPaths.map((p) => `• ${p.length > 90 ? `${p.slice(0, 88)}…` : p}`),
      ].join("\n"),
      {
        x: 0.5,
        y: CONTENT_TOP + 0.08,
        fontSize: 11,
        w: 12.2,
        valign: "top",
        h: 5.65,
        color: TR.ink,
        fontFace: "Calibri",
      },
    );
  } else {
    s3.addText(noData, {
      x: 0.5,
      y: CONTENT_TOP + 0.12,
      fontSize: 12,
      w: 12.2,
      fontFace: "Calibri",
    });
  }
  templateFooter(s3);

  const s4 = pptx.addSlide();
  addGreenTitleBand(pptx, s4, { title: "Issues & Risks", meta: report ? metaLine(report) : undefined });
  if (report) {
    s4.addText(`Bloqueios (heurística): ${report.analytics.blockedOrImpedimentLike}`, {
      x: 0.5,
      y: CONTENT_TOP + 0.06,
      fontSize: 11,
      color: TR.greenAccent,
      bold: true,
      fontFace: "Calibri",
    });
    const rows: { text: string; options?: { bold?: boolean; color?: string; fill?: { color: string } } }[][] = [
      [tableHeaderCell("Área (filtro)"), tableHeaderCell("Atrasadas")],
      ...report.analytics.overdueByArea.slice(0, 10).map((o) => [
        {
          text: o.areaPath.length > 42 ? `${o.areaPath.slice(0, 40)}…` : o.areaPath,
          options: { color: TR.ink, fontFace: "Calibri" },
        },
        { text: String(o.overdue), options: { color: TR.ink, fontFace: "Calibri" } },
      ]),
    ];
    s4.addTable(rows, {
      x: 0.5,
      y: CONTENT_TOP + 0.38,
      w: 12.2,
      colW: [9.8, 2.4],
      fontSize: 10,
      border: { type: "solid", color: TR.borderGrey, pt: 0.5 },
    });
    s4.addText(analyticsBlock(report), {
      x: 0.5,
      y: 5.55,
      fontSize: 9,
      color: TR.footerGrey,
      w: 12.2,
      fontFace: "Calibri",
    });
  } else {
    s4.addText(noData, {
      x: 0.5,
      y: CONTENT_TOP + 0.12,
      fontSize: 12,
      w: 12.2,
      fontFace: "Calibri",
    });
  }
  templateFooter(s4);

  const s5 = pptx.addSlide();
  addGreenTitleBand(pptx, s5, { title: "Roadmap", meta: report ? metaLine(report) : undefined });
  s5.addText(
    "Agrupado por cada Area Path do filtro (primeiro grupo em que o item encaixa), igual ao separador Roadmap da aplicação.",
    {
      x: 0.5,
      y: CONTENT_TOP + 0.04,
      fontSize: 10,
      color: TR.muted,
      w: 12.2,
      fontFace: "Calibri",
    },
  );
  let yRoad = CONTENT_TOP + 0.38;
  if (report) {
    const groups = groupRoadmapBySelectedAreas(report.roadmap, report.filter.areaPaths);
    let rowBudget = 12;
    for (const g of groups) {
      if (rowBudget <= 0) break;
      s5.addText(`${g.areaPath} (${g.rows.length} itens)`, {
        x: 0.5,
        y: yRoad,
        fontSize: 11,
        bold: true,
        color: TR.greenAccent,
        fontFace: "Calibri",
      });
      yRoad += 0.26;
      const take = Math.min(g.rows.length, Math.min(5, rowBudget));
      if (take === 0) {
        s5.addText("Nenhum work item neste agrupamento.", {
          x: 0.5,
          y: yRoad,
          fontSize: 9,
          color: TR.footerGrey,
          fontFace: "Calibri",
        });
        yRoad += 0.32;
        rowBudget -= 1;
        continue;
      }
      const head = [
        tableHeaderCell("ID"),
        tableHeaderCell("Tipo"),
        tableHeaderCell("Estado"),
        tableHeaderCell("%"),
        tableHeaderCell("Target"),
        tableHeaderCell("Título"),
      ];
      const body = g.rows.slice(0, take).map((r) => [
        { text: String(r.id), options: { color: TR.ink, fontFace: "Calibri" } },
        {
          text: r.workItemType.length > 10 ? `${r.workItemType.slice(0, 8)}…` : r.workItemType,
          options: { color: TR.ink, fontFace: "Calibri" },
        },
        {
          text: r.state.length > 12 ? `${r.state.slice(0, 10)}…` : r.state,
          options: { color: TR.ink, fontFace: "Calibri" },
        },
        {
          text: r.progressPercent == null ? "" : String(r.progressPercent),
          options: { color: TR.ink, fontFace: "Calibri" },
        },
        {
          text: r.targetDate.length > 10 ? r.targetDate.slice(0, 10) : r.targetDate,
          options: { color: TR.ink, fontFace: "Calibri" },
        },
        {
          text: (r.title || "").length > 28 ? `${(r.title || "").slice(0, 26)}…` : r.title || "",
          options: { color: TR.ink, fontFace: "Calibri" },
        },
      ]);
      s5.addTable([head, ...body], {
        x: 0.45,
        y: yRoad,
        w: 12.35,
        colW: [0.85, 1.25, 1.2, 0.55, 1.05, 7.45],
        fontSize: 7.5,
        border: { type: "solid", color: TR.borderGrey, pt: 0.35 },
      });
      yRoad += 0.32 + take * 0.21;
      rowBudget -= take + 1;
      if (g.rows.length > take) {
        s5.addText(`+ ${g.rows.length - take} itens (ver app).`, {
          x: 0.5,
          y: yRoad,
          fontSize: 8,
          color: TR.footerGrey,
          fontFace: "Calibri",
        });
        yRoad += 0.26;
      }
    }
    if (groups.length === 0) {
      s5.addText("Sem grupos.", { x: 0.5, y: yRoad, fontSize: 11, fontFace: "Calibri" });
    }
  } else {
    s5.addText(noData, {
      x: 0.5,
      y: CONTENT_TOP + 0.2,
      fontSize: 12,
      w: 12.2,
      fontFace: "Calibri",
    });
  }
  templateFooter(s5);

  const s6 = pptx.addSlide();
  addGreenTitleBand(pptx, s6, {
    title: "2. Dashboard consolidado",
    meta: report ? metaLine(report) : undefined,
  });
  if (report) {
    const c = report.consolidated;
    const vel = getExecutiveVelocity(report);
    const lines = [
      `TOTAL: ${c.total}`,
      `Closed: ${c.closed} · Active: ${c.active} · New: ${c.new}`,
      `Atrasadas: ${c.overdue} · Features (escopo): ${c.featureTotal}`,
      `Taxa conclusão: ${pct(c.completionRate)}`,
      `Velocity: ${vel.headline} — ${vel.detail}`,
    ];
    s6.addText(lines.join("\n"), {
      x: 0.5,
      y: CONTENT_TOP + 0.08,
      fontSize: 13,
      w: 12.2,
      valign: "top",
      h: 1.45,
      color: TR.ink,
      fontFace: "Calibri",
    });
    const rows2: { text: string; options?: { bold?: boolean; color?: string; fill?: { color: string } } }[][] = [
      [
        tableHeaderCell("Area Path"),
        tableHeaderCell("Tot"),
        tableHeaderCell("Cl"),
        tableHeaderCell("%"),
      ],
      ...report.byArea.slice(0, 10).map((a) => [
        {
          text: a.areaPath.length > 36 ? `${a.areaPath.slice(0, 34)}…` : a.areaPath,
          options: { color: TR.ink, fontFace: "Calibri" },
        },
        { text: String(a.total), options: { color: TR.ink, fontFace: "Calibri" } },
        { text: String(a.closed), options: { color: TR.ink, fontFace: "Calibri" } },
        { text: pct(a.completionRate), options: { color: TR.ink, fontFace: "Calibri" } },
      ]),
    ];
    s6.addTable(rows2, {
      x: 0.5,
      y: CONTENT_TOP + 1.72,
      w: 12.2,
      colW: [7.4, 1.6, 1.6, 1.6],
      fontSize: 9,
      border: { type: "solid", color: TR.borderGrey, pt: 0.5 },
    });
  } else {
    s6.addText(noData, {
      x: 0.5,
      y: CONTENT_TOP + 0.12,
      fontSize: 12,
      w: 12.2,
      fontFace: "Calibri",
    });
  }
  templateFooter(s6);

  const s7 = pptx.addSlide();
  addGreenTitleBand(pptx, s7, {
    title: "3. Principais avanços — entregas concluídas (recorte)",
    meta: report ? metaLine(report) : undefined,
  });
  if (report) {
    const closed = report.roadmap.filter((r) => isClosedLikeState(r.state)).slice(0, 14);
    const head7 = [
      tableHeaderCell("ID"),
      tableHeaderCell("Tipo"),
      tableHeaderCell("Estado"),
      tableHeaderCell("Target"),
      tableHeaderCell("Título"),
    ];
    const body7 = closed.map((r) => [
      { text: String(r.id), options: { color: TR.ink, fontFace: "Calibri" } },
      { text: r.workItemType.slice(0, 14), options: { color: TR.ink, fontFace: "Calibri" } },
      { text: r.state.slice(0, 14), options: { color: TR.ink, fontFace: "Calibri" } },
      { text: (r.targetDate || "").slice(0, 12), options: { color: TR.ink, fontFace: "Calibri" } },
      {
        text: r.title.length > 40 ? `${r.title.slice(0, 38)}…` : r.title,
        options: { color: TR.ink, fontFace: "Calibri" },
      },
    ]);
    if (body7.length === 0) {
      s7.addText("Nenhum item no roadmap com estado fechado neste recorte.", {
        x: 0.5,
        y: CONTENT_TOP + 0.12,
        fontSize: 11,
        color: TR.muted,
        fontFace: "Calibri",
      });
    } else {
      s7.addTable([head7, ...body7], {
        x: 0.45,
        y: CONTENT_TOP + 0.08,
        w: 12.35,
        colW: [0.85, 1.35, 1.15, 1.05, 7.95],
        fontSize: 8,
        border: { type: "solid", color: TR.borderGrey, pt: 0.35 },
      });
    }
    s7.addText(analyticsBlock(report), {
      x: 0.5,
      y: 6.05,
      fontSize: 8,
      color: TR.footerGrey,
      w: 12.2,
      fontFace: "Calibri",
    });
  } else {
    s7.addText(noData, {
      x: 0.5,
      y: CONTENT_TOP + 0.12,
      fontSize: 12,
      w: 12.2,
      fontFace: "Calibri",
    });
  }
  templateFooter(s7);

  const s8 = pptx.addSlide();
  addGreenTitleBand(pptx, s8, {
    title: "3. Principais avanços — em andamento (recorte)",
    meta: report ? metaLine(report) : undefined,
  });
  if (report) {
    const open = report.roadmap.filter((r) => !isClosedLikeState(r.state)).slice(0, 14);
    const head8 = [
      tableHeaderCell("ID"),
      tableHeaderCell("Tipo"),
      tableHeaderCell("Estado"),
      tableHeaderCell("Target"),
      tableHeaderCell("Título"),
    ];
    const body8 = open.map((r) => [
      { text: String(r.id), options: { color: TR.ink, fontFace: "Calibri" } },
      { text: r.workItemType.slice(0, 14), options: { color: TR.ink, fontFace: "Calibri" } },
      { text: r.state.slice(0, 14), options: { color: TR.ink, fontFace: "Calibri" } },
      { text: (r.targetDate || "").slice(0, 12), options: { color: TR.ink, fontFace: "Calibri" } },
      {
        text: r.title.length > 40 ? `${r.title.slice(0, 38)}…` : r.title,
        options: { color: TR.ink, fontFace: "Calibri" },
      },
    ]);
    if (body8.length === 0) {
      s8.addText("Nenhum item aberto no roadmap neste recorte.", {
        x: 0.5,
        y: CONTENT_TOP + 0.12,
        fontSize: 11,
        color: TR.muted,
        fontFace: "Calibri",
      });
    } else {
      s8.addTable([head8, ...body8], {
        x: 0.45,
        y: CONTENT_TOP + 0.08,
        w: 12.35,
        colW: [0.85, 1.35, 1.15, 1.05, 7.95],
        fontSize: 8,
        border: { type: "solid", color: TR.borderGrey, pt: 0.35 },
      });
    }
    s8.addText(analyticsBlock(report), {
      x: 0.5,
      y: 6.05,
      fontSize: 8,
      color: TR.footerGrey,
      w: 12.2,
      fontFace: "Calibri",
    });
  } else {
    s8.addText(noData, {
      x: 0.5,
      y: CONTENT_TOP + 0.12,
      fontSize: 12,
      w: 12.2,
      fontFace: "Calibri",
    });
  }
  templateFooter(s8);

  const sections: { title: string; sub: string }[] = [
    { title: "Plataforma - Certificados", sub: "Secção · indicadores do recorte ADO" },
    { title: "ONVIO BR · SNYK", sub: "Painel — métricas SNYK não disponíveis na app; resumo do recorte abaixo" },
    { title: "ONVIO BR · SNYK (continuação)", sub: "Detalhe operacional a preencher manualmente" },
    { title: "Nível de Serviço", sub: "Proxy a partir do relatório (throughput, WIP, aging)" },
    { title: "ONVIO BR · TechOps · Painel de indicadores", sub: "Disponibilidade / ITIL — dados externos; resumo ADO" },
    { title: "ONVIO BR · TechOps · Golden Signals", sub: "Latência / erros / saturação — integração futura" },
    { title: "ONVIO BR · TechOps · Tráfego", sub: "Tráfego — integração futura" },
    { title: "Iniciativas de IA", sub: "Estado das iniciativas — preencher na reunião" },
    { title: "Etapas da transformação", sub: "Roadmap de transformação — qualitativo" },
    { title: "Desafio do momento", sub: "Discussão facilitada" },
    { title: "LALUR · Extração regras", sub: "Projeto legado — fora do escopo ADO deste relatório" },
    { title: "Financeiro", sub: "Cloud / DataDog — custos não disponíveis na app" },
    { title: "ONVIO BR", sub: "Resumo do recorte do assistente" },
    { title: "Rateio de custos", sub: "Financeiro — preencher com dados reais" },
    { title: "Ações de curto prazo", sub: "Prioridades e owners — reunião" },
  ];
  for (const sec of sections) {
    tierC(sec.title, sec.sub);
  }

  const s25 = pptx.addSlide();
  addCoverDecor(pptx, s25);
  s25.addText("Thank you!", {
    x: 1.5,
    y: 2.85,
    w: 10.3,
    fontSize: 44,
    bold: true,
    color: TR.ink,
    align: "center",
    fontFace: "Calibri Light",
  });
  if (report) {
    s25.addText(report.filter.project, {
      x: 1.5,
      y: 3.65,
      w: 10.3,
      fontSize: 16,
      color: TR.muted,
      align: "center",
      fontFace: "Calibri",
    });
  }
  s25.addText(dateStr, {
    x: 1.5,
    y: 4.05,
    w: 10.3,
    fontSize: 12,
    color: TR.footerGrey,
    align: "center",
    fontFace: "Calibri",
  });
  templateFooter(s25);

  const base = report?.filter.project ? safeFilenamePart(report.filter.project) : "delivery";
  const safe = options?.filename ?? `delivery-followup-25-${base}.pptx`;
  await pptx.writeFile({ fileName: safe });
}
