"use client";

import type { ReportResult } from "@/lib/ado/report";
import { getExecutiveVelocity } from "@/lib/ado/executiveVelocity";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function ExecutiveSummaryKpis({ report }: { report: ReportResult }) {
  const c = report.consolidated;
  const vel = getExecutiveVelocity(report);
  const barWidthPct = Math.min(100, Math.max(0, c.completionRate * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "0.65rem" }}>
      <div className="executiveKpiRow1">
        <div className="metric">
          <b>{c.total}</b>
          <span>TOTAL</span>
        </div>
        <div className="metric">
          <b>{c.closed}</b>
          <span>CLOSED</span>
        </div>
        <div className="metric">
          <b>{c.active}</b>
          <span>ACTIVE</span>
        </div>
        <div className="metric">
          <b>{c.new}</b>
          <span>NEW</span>
        </div>
      </div>

      <div className="executiveKpiRow2">
        <div className="metric">
          <div className="kpiLabelCaps">% conclusão</div>
          <strong className="kpiCompletionValue">{pct(c.completionRate)}</strong>
          <div className="kpiProgressTrack" role="progressbar" aria-valuenow={Math.round(barWidthPct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="kpiProgressFill" style={{ width: `${barWidthPct}%` }} />
          </div>
        </div>
        <div className="metric">
          <div className="kpiLabelCaps">Velocity</div>
          <strong className="kpiVelocityValue">{vel.headline}</strong>
          <span className="kpiVelocityDetail">{vel.detail}</span>
        </div>
      </div>
    </div>
  );
}
