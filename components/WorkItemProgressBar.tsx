"use client";

type Props = {
  /** Percentagem de rollup (descendentes); null = sem descendentes */
  percent: number | null;
};

export function WorkItemProgressBar({ percent }: Props) {
  if (percent == null) {
    return (
      <div className="wiProgress" title="Sem descendentes na hierarquia">
        <div className="wiProgressTrack">
          <div className="wiProgressFill wiProgressFillNone" style={{ width: "0%" }} />
        </div>
        <span className="wiProgressLabel wiProgressLabelMuted">—</span>
      </div>
    );
  }

  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const done = p >= 100;

  return (
    <div className="wiProgress" title={`${p}% (descendentes completos / total)`}>
      <div className="wiProgressTrack">
        <div
          className={done ? "wiProgressFill wiProgressFillDone" : "wiProgressFill"}
          style={{ width: `${p}%` }}
        />
      </div>
      <span className="wiProgressLabel">{p}%</span>
    </div>
  );
}
