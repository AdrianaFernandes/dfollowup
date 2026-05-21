"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { DeckPendingRow } from "@/lib/deliveryMeetingDeckInput";
import { createEmptyDeckPendingRow, createInitialPendingRows } from "@/lib/deliveryMeetingDeckInput";

type Props = {
  rows?: DeckPendingRow[];
  onRowsChange?: Dispatch<SetStateAction<DeckPendingRow[]>>;
};

export function LastMeetingPendingCard({ rows: rowsProp, onRowsChange }: Props) {
  const [internalRows, setInternalRows] = useState<DeckPendingRow[]>(createInitialPendingRows);
  const controlled = rowsProp !== undefined && onRowsChange !== undefined;
  const rows = controlled ? rowsProp! : internalRows;
  const setRows = controlled ? onRowsChange! : setInternalRows;

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyDeckPendingRow()]);
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
    (id: string, field: keyof Omit<DeckPendingRow, "id">, value: string) => {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    },
    [setRows],
  );

  return (
    <section className="lastMeetingPendingCard" aria-labelledby="last-meeting-pending-title">
      <h3 id="last-meeting-pending-title" className="lastMeetingPendingTitle">
        Pendências da última reunião
      </h3>
      <hr className="lastMeetingPendingRule" />
      <p className="lastMeetingPendingSubtitle">
        Itens pendentes do follow-up anterior que precisam de acompanhamento.
      </p>

      <div className="lastMeetingPendingTable lastMeetingPendingGrid" role="group" aria-label="Pendências editáveis">
        <div className="lastMeetingPendingTh">Pendência</div>
        <div className="lastMeetingPendingTh">Owner</div>
        <div className="lastMeetingPendingTh">Status</div>
        <div className="lastMeetingPendingTh">Observação</div>
        <div className="lastMeetingPendingTh" aria-hidden="true" />

        {rows.map((row) => (
          <div key={row.id} className="lastMeetingPendingRow">
            <div className="lastMeetingPendingCell">
              <input
                type="text"
                value={row.pendencia}
                onChange={(e) => updateRow(row.id, "pendencia", e.target.value)}
                placeholder="Descrição da pendência"
                aria-label="Pendência"
              />
            </div>
            <div className="lastMeetingPendingCell">
              <input
                type="text"
                value={row.owner}
                onChange={(e) => updateRow(row.id, "owner", e.target.value)}
                placeholder="Owner"
                aria-label="Owner"
              />
            </div>
            <div className="lastMeetingPendingCell">
              <select
                value={row.status}
                onChange={(e) => updateRow(row.id, "status", e.target.value)}
                aria-label="Status"
              >
                <option value="pendente">🟡 Pendente</option>
                <option value="concluido">🟢 Concluído</option>
                <option value="bloqueado">🔴 Bloqueado</option>
              </select>
            </div>
            <div className="lastMeetingPendingCell">
              <input
                type="text"
                value={row.observacao}
                onChange={(e) => updateRow(row.id, "observacao", e.target.value)}
                placeholder="Observação / resolução"
                aria-label="Observação"
              />
            </div>
            <div className="lastMeetingPendingCell lastMeetingPendingCell--action">
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
        + Adicionar pendência
      </button>
    </section>
  );
}
