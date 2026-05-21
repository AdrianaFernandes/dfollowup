"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { DeckRiskRow } from "@/lib/deliveryMeetingDeckInput";
import { createEmptyDeckRiskRow, createInitialRiskRows } from "@/lib/deliveryMeetingDeckInput";

type Props = {
  rows?: DeckRiskRow[];
  onRowsChange?: Dispatch<SetStateAction<DeckRiskRow[]>>;
};

export function RisksActionPlanCard({ rows: rowsProp, onRowsChange }: Props) {
  const [internalRows, setInternalRows] = useState<DeckRiskRow[]>(createInitialRiskRows);
  const controlled = rowsProp !== undefined && onRowsChange !== undefined;
  const rows = controlled ? rowsProp! : internalRows;
  const setRows = controlled ? onRowsChange! : setInternalRows;

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyDeckRiskRow("medio")]);
  }, [setRows]);

  const removeRow = useCallback(
    (id: string) => {
      setRows((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((row) => row.id !== id);
      });
    },
    [setRows],
  );

  const updateRow = useCallback(
    (id: string, field: keyof Omit<DeckRiskRow, "id">, value: string) => {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    },
    [setRows],
  );

  return (
    <section className="risksActionPlanCard" aria-labelledby="risks-action-plan-title">
      <h3 id="risks-action-plan-title" className="risksActionPlanTitle">
        3. Riscos e Plano de Ação
      </h3>

      <div className="risksActionPlanTable" role="group" aria-label="Riscos e plano de ação editáveis">
        <div className="risksActionPlanHeader">
          <div className="risksActionPlanTh">Sev.</div>
          <div className="risksActionPlanTh">Risco</div>
          <div className="risksActionPlanTh">Área afetada</div>
          <div className="risksActionPlanTh">Plano de ação</div>
          <div className="risksActionPlanTh">Owner</div>
          <div className="risksActionPlanTh">Prazo</div>
          <div className="risksActionPlanTh" aria-hidden="true" />
        </div>

        {rows.map((row) => (
          <div key={row.id} className="risksActionPlanRow">
            <div className="risksActionPlanCell">
              <select
                value={row.sev}
                onChange={(e) => updateRow(row.id, "sev", e.target.value)}
                aria-label="Severidade"
              >
                <option value="alto">🔴</option>
                <option value="medio">🟡</option>
              </select>
            </div>
            <div className="risksActionPlanCell">
              <input
                type="text"
                value={row.risco}
                onChange={(e) => updateRow(row.id, "risco", e.target.value)}
                placeholder="Descricao do risco"
                aria-label="Risco"
              />
            </div>
            <div className="risksActionPlanCell">
              <input
                type="text"
                value={row.areaAfetada}
                onChange={(e) => updateRow(row.id, "areaAfetada", e.target.value)}
                placeholder="Area"
                aria-label="Área afetada"
              />
            </div>
            <div className="risksActionPlanCell">
              <input
                type="text"
                value={row.planoAcao}
                onChange={(e) => updateRow(row.id, "planoAcao", e.target.value)}
                placeholder="Acao"
                aria-label="Plano de ação"
              />
            </div>
            <div className="risksActionPlanCell">
              <input
                type="text"
                value={row.owner}
                onChange={(e) => updateRow(row.id, "owner", e.target.value)}
                placeholder="Owner"
                aria-label="Owner"
              />
            </div>
            <div className="risksActionPlanCell risksActionPlanCell--date">
              <input
                type="text"
                value={row.prazo}
                onChange={(e) => updateRow(row.id, "prazo", e.target.value)}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Prazo"
              />
            </div>
            <div className="risksActionPlanCell risksActionPlanCell--action">
              <button
                type="button"
                className="lastMeetingPendingRemove"
                aria-label="Remover linha"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="lastMeetingPendingAdd" onClick={addRow}>
        + Adicionar risco
      </button>
    </section>
  );
}
