/**
 * Dados editáveis na UI (separador Consolidado) enviados para o export PowerPoint
 * além do `ReportResult` do Azure DevOps.
 */

export type DeckPendingRow = {
  id: string;
  pendencia: string;
  owner: string;
  status: string;
  observacao: string;
};

export type DeckRiskRow = {
  id: string;
  sev: string;
  risco: string;
  areaAfetada: string;
  planoAcao: string;
  owner: string;
  prazo: string;
};

export type DeliveryMeetingDeckInput = {
  pendencias: DeckPendingRow[];
  riscos: DeckRiskRow[];
};

function createRowId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyDeckPendingRow(): DeckPendingRow {
  return {
    id: createRowId("pend"),
    pendencia: "",
    owner: "",
    status: "pendente",
    observacao: "",
  };
}

export function createEmptyDeckRiskRow(sev: string): DeckRiskRow {
  return {
    id: createRowId("risk"),
    sev,
    risco: "",
    areaAfetada: "",
    planoAcao: "",
    owner: "",
    prazo: "",
  };
}

export function createInitialPendingRows(): DeckPendingRow[] {
  return [createEmptyDeckPendingRow(), createEmptyDeckPendingRow()];
}

export function createInitialRiskRows(): DeckRiskRow[] {
  return [createEmptyDeckRiskRow("alto"), createEmptyDeckRiskRow("medio"), createEmptyDeckRiskRow("medio")];
}

function statusLabel(status: string): string {
  if (status === "pendente") return "Pendente";
  if (status === "concluido") return "Concluído";
  if (status === "bloqueado") return "Bloqueado";
  return status;
}

function sevLabel(sev: string): string {
  if (sev === "alto") return "Alto";
  if (sev === "medio") return "Médio";
  return sev;
}

function cell(s: string): string {
  return s.replace(/\r?\n/g, " ").replace(/\t/g, " ").trim();
}

/** Texto para `{{DF_UI_LAST_MEETING_PENDING}}` (TSV + cabeçalho). */
export function formatDeckPendenciasPlaceholder(rows: DeckPendingRow[]): string {
  if (!rows.length) return "";
  const lines = [
    "Pendência\tOwner\tStatus\tObservação",
    ...rows.map((r) =>
      [cell(r.pendencia), cell(r.owner), statusLabel(r.status), cell(r.observacao)].join("\t"),
    ),
  ];
  return lines.join("\n");
}

/** Texto para `{{DF_UI_RISKS_ACTION_PLAN}}` (TSV + cabeçalho). */
export function formatDeckRiscosPlaceholder(rows: DeckRiskRow[]): string {
  if (!rows.length) return "";
  const lines = [
    "Severidade\tRisco\tÁrea afetada\tPlano de ação\tOwner\tPrazo",
    ...rows.map((r) =>
      [
        sevLabel(r.sev),
        cell(r.risco),
        cell(r.areaAfetada),
        cell(r.planoAcao),
        cell(r.owner),
        cell(r.prazo),
      ].join("\t"),
    ),
  ];
  return lines.join("\n");
}
