"use client";

import type { ReactNode } from "react";
import type { ReportResult } from "@/lib/ado/report";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COL = {
  new: "#888888",
  active: "#ff8000",
  closed: "#107c10",
  bar: "#0078d4",
};

type Props = {
  report: ReportResult;
  adoOrg: string;
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtDays(n: number | null | undefined, suffix = " d"): string {
  if (n == null || Number.isNaN(n)) return "N/D";
  return `${n.toFixed(n >= 10 ? 0 : 1)}${suffix}`;
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

function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="analyticsChartBlock">
      <div className="analyticsChartTitle">{title}</div>
      {children}
    </div>
  );
}

export function AnalyticsChartsPanel({ report, adoOrg }: Props) {
  const a = report.analytics;
  const f = report.filter;
  const projectEnc = encodeURIComponent(report.filter.project);

  const statePie = [
    { name: "New", value: a.stateDistributionPct.new * 100, fill: COL.new },
    { name: "Active", value: a.stateDistributionPct.active * 100, fill: COL.active },
    { name: "Closed", value: a.stateDistributionPct.closed * 100, fill: COL.closed },
  ];

  const mixBar = a.mixByType.map((m) => ({
    name: m.workItemType,
    count: m.count,
  }));

  const tagsBar = a.topTags.map((t) => ({ name: t.tag, count: t.count }));

  const overdueBar = a.overdueByArea.map((r) => ({
    name: trunc(r.areaPath, 36),
    fullPath: r.areaPath,
    overdue: r.overdue,
  }));

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Os mesmos work items do relatório. <strong>Lead time</strong>: System.CreatedDate →
        Microsoft.VSTS.Common.ClosedDate. <strong>Cycle time</strong>: Start Date → Closed.{" "}
        <strong>Throughput (fechados na janela)</strong>: só com filtro por Target Date no assistente
        (Closed date dentro do intervalo).
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
      <div className="analyticsChartsGrid">
        <ChartFrame title="Distribuição por estado (%)">
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={1}
                >
                  {statePie.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [
                    typeof v === "number" ? `${v.toFixed(1)}%` : String(v ?? ""),
                    "Parte",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame title="Mix por tipo de work item">
          {mixBar.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Sem dados.
            </p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={mixBar}
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={92}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v) => [typeof v === "number" ? v : Number(v), "Qtd"]}
                    labelFormatter={(_, p) =>
                      String((p?.[0]?.payload as { name?: string })?.name ?? "")
                    }
                  />
                  <Bar dataKey="count" fill={COL.bar} name="Qtd" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartFrame>

        <ChartFrame title="Tags mais frequentes">
          {tagsBar.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Sem tags no recorte.
            </p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={tagsBar} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} width={32} />
                  <Tooltip formatter={(v) => [typeof v === "number" ? v : Number(v), "Itens"]} />
                  <Bar dataKey="count" fill={COL.bar} name="Itens" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartFrame>

        <ChartFrame title="Atrasadas por Area Path (filtro)">
          {overdueBar.every((r) => r.overdue === 0) ? (
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma atrasada nestas áreas (ou sem Target Date).
            </p>
          ) : (
            <div style={{ width: "100%", height: Math.min(360, 80 + overdueBar.length * 28) }}>
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={overdueBar}
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={108}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v) => [typeof v === "number" ? v : Number(v), "Atrasadas"]}
                    labelFormatter={(_, p) => {
                      const row = p?.[0]?.payload as { fullPath?: string; name: string };
                      return row?.fullPath ?? row?.name ?? "";
                    }}
                  />
                  <Bar dataKey="overdue" fill="#c41e3a" name="Atrasadas" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartFrame>
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

      <h3 className="trSectionTitle" style={{ marginTop: "1rem" }}>
        3. Qualidade de fluxo
      </h3>
      <div className="metricGrid">
        <div className="metric">
          <b>{a.wip.total}</b>
          <span>WIP (New + Active)</span>
        </div>
        <div className="metric">
          <b>{a.wip.new}</b>
          <span>WIP — New</span>
        </div>
        <div className="metric">
          <b>{a.wip.active}</b>
          <span>WIP — Active</span>
        </div>
        <div className="metric">
          <b>{pct(a.stateDistributionPct.new)}</b>
          <span>% New</span>
        </div>
        <div className="metric">
          <b>{pct(a.stateDistributionPct.active)}</b>
          <span>% Active</span>
        </div>
        <div className="metric">
          <b>{pct(a.stateDistributionPct.closed)}</b>
          <span>% Closed</span>
        </div>
        <div className="metric">
          <b>{fmtDays(a.leadTimeDays.median)}</b>
          <span>LEAD TIME mediano (dias, n={a.leadTimeDays.sampleSize})</span>
        </div>
        <div className="metric">
          <b>{fmtDays(a.leadTimeDays.p85)}</b>
          <span>LEAD TIME p85</span>
        </div>
        <div className="metric">
          <b>{fmtDays(a.cycleTimeDays.median)}</b>
          <span>CYCLE TIME mediano (n={a.cycleTimeDays.sampleSize})</span>
        </div>
        <div className="metric">
          <b>{fmtDays(a.cycleTimeDays.p85)}</b>
          <span>CYCLE TIME p85</span>
        </div>
        <div className="metric">
          <b>{fmtDays(a.agingOpenDays.median)}</b>
          <span>
            IDADE média itens abertos (dias desde Created, n={a.agingOpenDays.sampleSize})
          </span>
        </div>
        <div className="metric">
          <b>{fmtDays(a.agingOpenDays.p85)}</b>
          <span>IDADE p85 (abertos)</span>
        </div>
      </div>

      <h3 className="trSectionTitle" style={{ marginTop: "1rem" }}>
        4. Valor e foco
      </h3>
      <div className="metricGrid" style={{ marginBottom: "0.65rem" }}>
        <div className="metric">
          <b>{a.blockedOrImpedimentLike}</b>
          <span>COM TAG/TÍTULO tipo bloqueio (heurística)</span>
        </div>
      </div>
      <div className="tableWrap" style={{ marginBottom: "0.75rem" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {a.mixByType.map((row) => (
              <tr key={row.workItemType}>
                <td>{row.workItemType}</td>
                <td>{row.count}</td>
                <td>{pct(row.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>
        Tags mais frequentes (Tags field)
      </p>
      <div className="tableWrap">
        <table className="data">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Itens</th>
            </tr>
          </thead>
          <tbody>
            {a.topTags.length === 0 ? (
              <tr>
                <td colSpan={2} className="muted">
                  Sem tags no recorte.
                </td>
              </tr>
            ) : (
              a.topTags.map((t) => (
                <tr key={t.tag}>
                  <td>{t.tag}</td>
                  <td>{t.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
