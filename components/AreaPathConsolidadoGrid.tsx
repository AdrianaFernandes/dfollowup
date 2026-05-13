"use client";

import type { AreaSummary } from "@/lib/ado/report";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const CHART = {
  closed: "#107c10",
  active: "#ff8000",
  new: "#888888",
  empty: "#e9e9e9",
} as const;

/** Rotação de cor de destaque por cartão (título + borda + rodapé). */
const ACCENT_THEMES = ["#5c2d91", "#0078d4", "#107c10"] as const;

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function displayAreaTitle(fullPath: string): string {
  const parts = fullPath.split("\\").filter(Boolean);
  const last = parts[parts.length - 1] ?? fullPath;
  return last.length > 42 ? `${last.slice(0, 40)}…` : last;
}

function AreaPathKpiCard({ area, themeIndex }: { area: AreaSummary; themeIndex: number }) {
  const accent = ACCENT_THEMES[themeIndex % ACCENT_THEMES.length];
  const pieSlices = [
    { name: "Closed", value: area.closed, fill: CHART.closed },
    { name: "Active", value: area.active, fill: CHART.active },
    { name: "New", value: area.new, fill: CHART.new },
  ].filter((d) => d.value > 0);

  const pieData =
    pieSlices.length > 0
      ? pieSlices
      : [{ name: "Sem itens", value: 1, fill: CHART.empty }];

  return (
    <article
      className="areaPathKpiCard"
      style={{ borderLeftColor: accent }}
    >
      <header className="areaPathKpiCardHeader">
        <h3 className="areaPathKpiCardTitle" style={{ color: accent }} title={area.areaPath}>
          {displayAreaTitle(area.areaPath)}
        </h3>
        <span className="areaPathKpiItemCount">{area.total} itens</span>
      </header>

      <div className="areaPathKpiBody">
        <div className="areaPathKpiDonutWrap">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={66}
                paddingAngle={pieData.length > 1 ? 2 : 0}
                stroke="none"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="areaPathKpiDonutCenter">{area.total}</div>
        </div>

        <div className="areaPathKpiStats">
          <div className="areaPathKpiStatRow">
            <span>Closed</span>
            <strong>{area.closed}</strong>
          </div>
          <div className="areaPathKpiStatRow">
            <span>Active</span>
            <strong>{area.active}</strong>
          </div>
          <div className="areaPathKpiStatRow">
            <span>New</span>
            <strong>{area.new}</strong>
          </div>
          <div className="areaPathKpiStatRow">
            <span>Atrasadas</span>
            <strong>{area.overdue}</strong>
          </div>
          <div className="areaPathKpiStatRow areaPathKpiStatTotal">
            <span>Total items</span>
            <strong>{area.total}</strong>
          </div>
        </div>
      </div>

      <footer
        className="areaPathKpiFooter"
        style={{ color: accent }}
        title="Closed ÷ Total no recorte desta área"
      >
        Taxa de Eficiência: {pct(area.completionRate)}
      </footer>
    </article>
  );
}

export function AreaPathConsolidadoGrid({ areas }: { areas: AreaSummary[] }) {
  if (areas.length === 0) {
    return (
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Sem áreas no recorte.
      </p>
    );
  }

  return (
    <div className="consolidadoAreaGrid">
      {areas.map((area, i) => (
        <AreaPathKpiCard key={area.areaPath} area={area} themeIndex={i} />
      ))}
    </div>
  );
}
