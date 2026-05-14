"use client";

import { useMemo } from "react";
import { buildAreaStatePivot, pivotStateCellBg } from "@/lib/ado/areaStatePivot";
import type { ReportResult } from "@/lib/ado/report";

type Props = {
  report: ReportResult;
  adoOrg: string;
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtRatio(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "N/D";
  return n.toFixed(2) + "×";
}

function trunc(s: string, max = 40) {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

export function AnalyticsChartsPanel({ report, adoOrg }: Props) {
  const a = report.analytics;
  const f = report.filter;
  const projectEnc = encodeURIComponent(report.filter.project);

  const areaStatePivot = useMemo(() => buildAreaStatePivot(report.roadmap), [report.roadmap]);

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Os mesmos work items do relatório. <strong>Throughput (fechados no recorte)</strong> e KPIs abaixo
        alinham com o WIQL do passo 4.
      </p>
      {a.notes.length > 0 ? (
        <ul className="muted" style={{ paddingLeft: "1.2rem", marginBottom: "0.75rem" }}>
          {a.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <h3 className="trSectionTitle" style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
        Visão gráfica
      </h3>

      <div className="analyticsChartBlock analyticsPivotFullWidth" style={{ marginBottom: "1rem" }}>
        <div className="analyticsChartTitle">Area Path × Estado (contagem)</div>
        <p className="muted" style={{ margin: "0 0 0.6rem", fontSize: "0.85rem" }}>
          Mesmos work items do relatório (WIQL do passo 4). Equivalente a um pivot no Azure DevOps com{" "}
          <strong>linhas = Area Path</strong>, <strong>colunas = State</strong> e agregação{" "}
          <strong>Count</strong> de work items.
        </p>
        {areaStatePivot.grandTotal === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Sem itens no recorte para esta matriz.
          </p>
        ) : (
          <div className="pivotTableScroll">
            <table className="data pivotAreaStateTable">
              <thead>
                <tr>
                  <th className="pivotCornerTh">Area Path</th>
                  {areaStatePivot.states.map((st) => (
                    <th
                      key={st}
                      className="pivotStateTh"
                      title={st}
                      style={{ background: pivotStateCellBg(st) }}
                    >
                      {trunc(st, 14)}
                    </th>
                  ))}
                  <th className="pivotTotalColTh">Total</th>
                </tr>
              </thead>
              <tbody>
                {areaStatePivot.areaPaths.map((ap, ai) => (
                  <tr key={ap}>
                    <th scope="row" className="pivotAreaTh" title={ap}>
                      {trunc(ap, 48)}
                    </th>
                    {areaStatePivot.states.map((st, si) => {
                      const n = areaStatePivot.matrix[ai][si];
                      return (
                        <td
                          key={st}
                          className="pivotCountTd"
                          style={{
                            background: pivotStateCellBg(st),
                            textAlign: "center",
                          }}
                        >
                          {n === 0 ? "—" : n}
                        </td>
                      );
                    })}
                    <td className="pivotTotalTd">{areaStatePivot.rowTotals[ai]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="pivotTotalRowTh">
                    Total
                  </th>
                  {areaStatePivot.states.map((st, si) => (
                    <td
                      key={st}
                      className="pivotTotalTd"
                      style={{ background: pivotStateCellBg(st), textAlign: "center" }}
                    >
                      {areaStatePivot.colTotals[si]}
                    </td>
                  ))}
                  <td className="pivotGrandTd">{areaStatePivot.grandTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <h3 className="trSectionTitle" style={{ marginTop: "0.5rem" }}>
        1. Saúde da entrega
      </h3>
      <div className="metricGrid">
        <div className="metric">
          <b>{a.throughputClosed}</b>
          <span>THROUGHPUT (itens Closed no recorte)</span>
        </div>
        <div className="metric">
          <b>{pct(report.consolidated.completionRate)}</b>
          <span>TAXA DE CONCLUSÃO (vs total no recorte)</span>
        </div>
        {f.dateMode === "targetDate" && a.throughputClosedInDateWindow != null ? (
          <div className="metric">
            <b>{a.throughputClosedInDateWindow}</b>
            <span>FECHADOS NA JANELA (Closed date no intervalo Target Date)</span>
          </div>
        ) : null}
        <div className="metric">
          <b>{fmtRatio(a.leadTimeVariabilityRatio)}</b>
          <span>PREVISIBILIDADE (p85 ÷ mediana do lead time; &gt;1 = cauda longa)</span>
        </div>
      </div>

      <h3 className="trSectionTitle" style={{ marginTop: "1rem" }}>
        2. Risco e compromissos de datas
      </h3>
      <div className="metricGrid" style={{ marginBottom: "0.75rem" }}>
        <div className="metric">
          <b>{report.consolidated.overdue}</b>
          <span>ATRASADAS (Target &lt; hoje, não Closed)</span>
        </div>
      </div>
      <div className="tableWrap" style={{ marginBottom: "0.75rem" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Area Path (filtro)</th>
              <th>Atrasadas</th>
            </tr>
          </thead>
          <tbody>
            {a.overdueByArea.map((r) => (
              <tr key={r.areaPath}>
                <td>{r.areaPath}</td>
                <td>{r.overdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Itens abertos mais antigos (por Created)
      </p>
      <div className="tableWrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Dias aberto</th>
              <th>Area Path</th>
              <th>Title</th>
            </tr>
          </thead>
          <tbody>
            {a.agingTop.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhum item aberto no recorte.
                </td>
              </tr>
            ) : (
              a.agingTop.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a
                      href={`https://dev.azure.com/${encodeURIComponent(adoOrg)}/${projectEnc}/_workitems/edit/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.id}
                    </a>
                  </td>
                  <td>{r.workItemType}</td>
                  <td>{r.daysOpen}</td>
                  <td>{r.areaPath}</td>
                  <td>{r.title || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
