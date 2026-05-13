"use client";

import PptxGenJS from "pptxgenjs";
import type { ReportResult } from "@/lib/ado/report";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function safeFilenamePart(raw: string) {
  return raw.replace(/[^\w.-]+/g, "_").slice(0, 80) || "delivery";
}

/** Subtítulo padrão: slot de tempo + foco do tópico. */
function slot15(focus: string) {
  return `15 min · ${focus}`;
}

export async function downloadDeliveryMeetingPptx(
  report: ReportResult | null,
  options?: { filename?: string; meetingDate?: Date },
) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const when = options?.meetingDate ?? new Date();
  const dateStr = when.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const proj = report?.filter.project ?? null;
  const projLine = proj
    ? `Projeto ADO: ${proj}`
    : "Dados ADO: gere um relatório na app para preencher Roadmap e Service Level com números.";

  const cover = pptx.addSlide();
  cover.addText("Reunião de delivery", { x: 0.5, y: 0.45, fontSize: 32, bold: true });
  cover.addText("Agenda padronizada (90 min)", { x: 0.5, y: 1.05, fontSize: 18, color: "444444" });
  cover.addText(dateStr, { x: 0.5, y: 1.45, fontSize: 14, color: "666666" });
  cover.addText(projLine, { x: 0.5, y: 1.85, fontSize: 13, color: "666666", w: 9 });

  const agenda = pptx.addSlide();
  agenda.addText("Agenda", { x: 0.5, y: 0.35, fontSize: 24, bold: true });
  agenda.addText("6 blocos × 15 minutos", { x: 0.5, y: 0.72, fontSize: 12, color: "666666" });
  const agendaRows = [
    [
      { text: "Tempo", options: { bold: true } },
      { text: "Tópico", options: { bold: true } },
    ],
    [{ text: "15 min" }, { text: "Recap / Pending da reunião anterior" }],
    [{ text: "15 min" }, { text: "Issues / Risks — plano de acção e mitigação" }],
    [{ text: "15 min" }, { text: "Roadmap — conquistas, atrasos, planos de acção" }],
    [{ text: "15 min" }, { text: "Service Level — SLA, backlog, incidentes, aging, NPS, etc." }],
    [{ text: "15 min" }, { text: "AI Initiatives — estado e progresso" }],
    [{ text: "15 min" }, { text: "Finance — Cloud cost, DataDog cost" }],
  ];
  agenda.addTable(agendaRows, {
    x: 0.45,
    y: 1.05,
    w: 9.2,
    colW: [1.1, 8.1],
    fontSize: 11,
    border: { type: "solid", color: "CCCCCC", pt: 0.5 },
  });

  const sRecap = pptx.addSlide();
  sRecap.addText("Recap / Pending", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  sRecap.addText(slot15("follow-up da última reunião"), {
    x: 0.5,
    y: 0.78,
    fontSize: 12,
    color: "666666",
    italic: true,
  });
  sRecap.addText(
    [
      "• Revisão das decisões e action items da reunião anterior",
      "• O que ficou pendente e estado actual (Done / Em curso / Bloqueado)",
      "• Novos pedidos de clarificação para fechar nesta sessão",
    ].join("\n"),
    { x: 0.5, y: 1.05, fontSize: 14, valign: "top", w: 9, h: 3.6 },
  );

  const sRisk = pptx.addSlide();
  sRisk.addText("Issues / Risks", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  sRisk.addText(slot15("plano de acção e mitigação"), {
    x: 0.5,
    y: 0.78,
    fontSize: 12,
    color: "666666",
    italic: true,
  });
  sRisk.addText(
    [
      "• Top riscos / issues (impacto, probabilidade, dono)",
      "• Plano de mitigação e datas-alvo",
      "• Escalamentos necessários (stakeholders, dependências)",
    ].join("\n"),
    { x: 0.5, y: 1.05, fontSize: 14, valign: "top", w: 9, h: 3.6 },
  );

  const sRoad = pptx.addSlide();
  sRoad.addText("Roadmap", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  sRoad.addText(slot15("conquistas, atrasos, planos de acção"), {
    x: 0.5,
    y: 0.78,
    fontSize: 12,
    color: "666666",
    italic: true,
  });
  const roadBullets = [
    "• Conquistas desde a última reunião (entregas fechadas, milestones)",
    "• Atrasos e causas-raiz resumidas",
    "• Planos de acção e owners para recuperar ou manter o ritmo",
  ];
  sRoad.addText(roadBullets.join("\n"), { x: 0.5, y: 1.02, fontSize: 13, valign: "top", w: 9, h: 1.35 });

  if (report) {
    const c = report.consolidated;
    const dataLines = [
      `Recorte actual (ADO): Total ${c.total} · Closed ${c.closed} · Active ${c.active} · New ${c.new}`,
      `Atrasadas (Target antes de hoje, não Closed): ${c.overdue} · Taxa conclusão: ${pct(c.completionRate)}`,
      `Itens no roadmap (lista): ${report.roadmap.length}`,
    ];
    sRoad.addText(dataLines.join("\n"), {
      x: 0.5,
      y: 2.45,
      fontSize: 11,
      color: "333333",
      valign: "top",
      w: 9,
      h: 0.85,
    });
    const topOver = report.analytics.overdueByArea.slice(0, 5);
    if (topOver.length > 0) {
      const rows = [
        [
          { text: "Area Path", options: { bold: true } },
          { text: "Atrasadas", options: { bold: true } },
        ],
        ...topOver.map((o) => [
          { text: o.areaPath.length > 42 ? `${o.areaPath.slice(0, 40)}…` : o.areaPath },
          { text: String(o.overdue) },
        ]),
      ];
      sRoad.addTable(rows, {
        x: 0.45,
        y: 3.35,
        w: 9.2,
        colW: [7.4, 1.8],
        fontSize: 9,
        border: { type: "solid", color: "CCCCCC", pt: 0.5 },
      });
    }
  } else {
    sRoad.addText(
      "(Gere o relatório na app para incluir métricas e atrasadas por área neste slide.)",
      { x: 0.5, y: 2.45, fontSize: 11, color: "888888", italic: true, w: 9 },
    );
  }

  const sSvc = pptx.addSlide();
  sSvc.addText("Service Level", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  sSvc.addText(slot15("SLA, backlog, incidentes, aging, NPS"), {
    x: 0.5,
    y: 0.78,
    fontSize: 12,
    color: "666666",
    italic: true,
  });
  sSvc.addText(
    [
      "• SLA / SLO acordados vs. real (preencher com dados de operações)",
      "• Backlog de incidentes / pedidos e tendência",
      "• Aging de tickets críticos",
      "• NPS / CSAT (fonte: equipa de produto ou suporte)",
    ].join("\n"),
    { x: 0.5, y: 1.02, fontSize: 13, valign: "top", w: 9, h: 1.5 },
  );

  if (report) {
    const a = report.analytics;
    const svcData = [
      "Indicadores do recorte ADO (proxy de saúde de entrega):",
      `• Throughput (closed): ${a.throughputClosed}`,
      `• WIP: ${a.wip.total} (New ${a.wip.new} / Active ${a.wip.active})`,
      `• Lead time mediana: ${a.leadTimeDays.median ?? "N/D"} d · Aging abertos mediano: ${a.agingOpenDays.median ?? "N/D"} d`,
      `• Bloqueios (heurística tags/título): ${a.blockedOrImpedimentLike}`,
      "• Incidentes / NPS: não disponíveis na app — preencher manualmente.",
    ].join("\n");
    sSvc.addText(svcData, {
      x: 0.5,
      y: 2.55,
      fontSize: 11,
      color: "333333",
      valign: "top",
      w: 9,
      h: 1.35,
    });
  } else {
    sSvc.addText(
      "(Gere o relatório na app para throughput, WIP e aging a partir do Azure DevOps.)",
      { x: 0.5, y: 2.55, fontSize: 11, color: "888888", italic: true, w: 9 },
    );
  }

  const sAi = pptx.addSlide();
  sAi.addText("AI Initiatives", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  sAi.addText(slot15("status report e progresso"), {
    x: 0.5,
    y: 0.78,
    fontSize: 12,
    color: "666666",
    italic: true,
  });
  sAi.addText(
    [
      "• Lista de iniciativas AI em curso (nome, sponsor, objetivo de negócio)",
      "• Progresso vs. roadmap interno (% milestones, demo, piloto)",
      "• Riscos (dados, compliance, orçamento) e pedidos de decisão",
    ].join("\n"),
    { x: 0.5, y: 1.05, fontSize: 14, valign: "top", w: 9, h: 3.6 },
  );

  const sFin = pptx.addSlide();
  sFin.addText("Finance", { x: 0.5, y: 0.35, fontSize: 22, bold: true });
  sFin.addText(slot15("Cloud cost, DataDog cost"), {
    x: 0.5,
    y: 0.78,
    fontSize: 12,
    color: "666666",
    italic: true,
  });
  sFin.addText(
    [
      "• Cloud: consumo vs. orçamento (período, variância, drivers)",
      "• Observabilidade (DataDog): custo, hosts/containers indexados, oportunidades de optimização",
      "• Decisões pedidas (reservas, tiers, retenção de logs, etc.)",
    ].join("\n"),
    { x: 0.5, y: 1.05, fontSize: 14, valign: "top", w: 9, h: 3.6 },
  );

  const base = proj ? safeFilenamePart(proj) : "delivery";
  const safe = options?.filename ?? `reuniao-delivery-${base}.pptx`;
  await pptx.writeFile({ fileName: safe });
}
