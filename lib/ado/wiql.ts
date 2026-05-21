import type { ReportFilterInput } from "./filters";

export function escapeWiqlString(s: string): string {
  return s.replace(/'/g, "''");
}

function areaClause(areaPaths: string[]): string {
  const parts = areaPaths.map((p) => `[System.AreaPath] UNDER '${escapeWiqlString(p)}'`);
  return `(${parts.join(" OR ")})`;
}

function iterationClause(iterationPaths: string[]): string {
  const parts = iterationPaths.map((p) => `[System.IterationPath] UNDER '${escapeWiqlString(p)}'`);
  return `(${parts.join(" OR ")})`;
}

function targetDateClause(start: string, end: string): string {
  const a = escapeWiqlString(start.trim());
  const b = escapeWiqlString(end.trim());
  return (
    `[Microsoft.VSTS.Scheduling.TargetDate] >= '${a}' AND ` +
    `[Microsoft.VSTS.Scheduling.TargetDate] <= '${b}'`
  );
}

function typesClause(types: string[]): string {
  const inner = types.map((t) => `'${escapeWiqlString(t)}'`).join(", ");
  return `[System.WorkItemType] IN (${inner})`;
}

function statesClause(stateNames: string[]): string {
  const inner = stateNames.map((s) => `'${escapeWiqlString(s)}'`).join(", ");
  return `[System.State] IN (${inner})`;
}

export function buildIdsOnlyWiql(filter: ReportFilterInput): string {
  const project = escapeWiqlString(filter.project);
  const states =
    filter.states?.length && filter.states.length > 0 ? `AND ${statesClause(filter.states)} ` : "";
  return (
    `SELECT [System.Id] FROM WorkItems ` +
    `WHERE [System.TeamProject] = '${project}' ` +
    `AND ${areaClause(filter.areaPaths)} ` +
    `AND ${typesClause(filter.workItemTypes)} ` +
    states +
    (filter.dateMode === "iteration"
      ? `AND ${iterationClause(filter.iterationPaths ?? [])} `
      : `AND ${targetDateClause(filter.targetDateStart!, filter.targetDateEnd!)} `) +
    `ORDER BY [System.Id]`
  );
}

export { ROADMAP_FIELD_REFS } from "./constants";
