"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportFilterInput, WorkItemTypeName } from "@/lib/ado/filters";
import { WORK_ITEM_TYPES } from "@/lib/ado/filters";
import type { ReportResult, RoadmapRow } from "@/lib/ado/report";
import { groupRoadmapBySelectedAreas } from "@/lib/ado/roadmapGroups";
import { STATE_BUCKET_GLOSSARY_PT } from "@/lib/ado/states";
import { downloadCsv } from "@/lib/exportCsv";
import { downloadReportPdf } from "@/lib/exportReportPdf";
import { downloadDeliveryMeetingPptx } from "@/lib/exportDeliveryMeetingPptx";
import {
  createInitialPendingRows,
  createInitialRiskRows,
  type DeckPendingRow,
  type DeckRiskRow,
} from "@/lib/deliveryMeetingDeckInput";
import { buildReportKpiPayload, formatDelta, type ReportKpiPayload } from "@/lib/reportKpis";
import { getExecutiveVelocity } from "@/lib/ado/executiveVelocity";
import { ExecutiveSummaryKpis } from "@/components/ExecutiveSummaryKpis";
import { AreaPathConsolidadoGrid } from "@/components/AreaPathConsolidadoGrid";
import { LastMeetingPendingCard } from "@/components/LastMeetingPendingCard";
import { RisksActionPlanCard } from "@/components/RisksActionPlanCard";
import { WorkItemProgressBar } from "@/components/WorkItemProgressBar";
import { AnalyticsChartsPanel } from "@/components/AnalyticsChartsPanel";

const ADO_ORG = process.env.NEXT_PUBLIC_AZURE_DEVOPS_ORG ?? "tr-ggo";

/** Evita URLs relativas ambíguas em alguns browsers / extensões. */
function appApiUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

function isLikelyNetworkFetchFailure(e: unknown): boolean {
  if (!(e instanceof TypeError)) return false;
  const m = e.message;
  return (
    /failed to fetch/i.test(m) ||
    m === "Load failed" ||
    /networkerror when attempting to fetch/i.test(m) ||
    /network request failed/i.test(m)
  );
}

type ProjectRow = { id: string; name: string };

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

const FILTER_PAYLOAD_VERSION = 1 as const;

type SavedWizardPayload = {
  version: typeof FILTER_PAYLOAD_VERSION;
  project: string;
  selectedAreas: string[];
  dateMode: "iteration" | "targetDate";
  selectedIters: string[];
  targetStart: string;
  targetEnd: string;
  types: WorkItemTypeName[];
  /** Estados incluídos na WIQL; omitido se todos os estados do processo estiverem seleccionados. */
  selectedStates?: string[];
};

type SavedFilterRow = {
  id: string;
  name: string;
  createdAt: string;
  payload: unknown;
};

type SnapshotListItem = {
  id: string;
  label: string | null;
  createdAt: string;
  kpis: unknown;
};

function isReportKpiPayload(x: unknown): x is ReportKpiPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.total === "number" &&
    typeof o.closed === "number" &&
    typeof o.active === "number" &&
    typeof o.new === "number"
  );
}

function isWorkItemTypeName(t: string): t is WorkItemTypeName {
  return (WORK_ITEM_TYPES as readonly string[]).includes(t);
}

function isSavedWizardPayload(x: unknown): x is SavedWizardPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const ver = o.version;
  if (ver !== undefined && ver !== FILTER_PAYLOAD_VERSION) return false;
  if (typeof o.project !== "string") return false;
  if (!Array.isArray(o.selectedAreas) || !o.selectedAreas.every((a) => typeof a === "string")) return false;
  if (o.dateMode !== "iteration" && o.dateMode !== "targetDate") return false;
  if (!Array.isArray(o.selectedIters) || !o.selectedIters.every((a) => typeof a === "string")) return false;
  if (typeof o.targetStart !== "string" || typeof o.targetEnd !== "string") return false;
  if (!Array.isArray(o.types) || !o.types.every((t) => typeof t === "string" && isWorkItemTypeName(t))) return false;
  if (o.selectedStates !== undefined) {
    if (!Array.isArray(o.selectedStates) || !o.selectedStates.every((s) => typeof s === "string")) return false;
  }
  return true;
}

export default function DeliveryFollowupClient() {
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectErr, setProjectErr] = useState<string | null>(null);

  const [project, setProject] = useState<string>("");
  const [areas, setAreas] = useState<string[]>([]);
  const [areaSearch, setAreaSearch] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [areaErr, setAreaErr] = useState<string | null>(null);

  const [dateMode, setDateMode] = useState<"iteration" | "targetDate">("iteration");
  const [iterations, setIterations] = useState<string[]>([]);
  const [iterSearch, setIterSearch] = useState("");
  const [selectedIters, setSelectedIters] = useState<string[]>([]);
  const [targetStart, setTargetStart] = useState("");
  const [targetEnd, setTargetEnd] = useState("");
  const [loadingIters, setLoadingIters] = useState(false);
  const [iterErr, setIterErr] = useState<string | null>(null);

  const [types, setTypes] = useState<WorkItemTypeName[]>([
    "Epic",
    "Feature",
    "User Story",
    "Task",
    "Bug",
  ]);

  const [availableStatesMeta, setAvailableStatesMeta] = useState<{ name: string; category: string }[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesErr, setStatesErr] = useState<string | null>(null);
  const wizardStateRestoreRef = useRef<string[] | null>(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportErr, setReportErr] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [resultTab, setResultTab] = useState<"consolidado" | "roadmap" | "analises">(
    "consolidado",
  );
  const resultsRef = useRef<HTMLDivElement>(null);

  const [savedFilters, setSavedFilters] = useState<SavedFilterRow[]>([]);
  const [savedFiltersLoading, setSavedFiltersLoading] = useState(false);
  const [savedFiltersErr, setSavedFiltersErr] = useState<string | null>(null);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [saveFilterErr, setSaveFilterErr] = useState<string | null>(null);
  const [saveFilterBusy, setSaveFilterBusy] = useState(false);
  const [savedFilterSelect, setSavedFilterSelect] = useState("");

  const [saveSnapshotAfterRun, setSaveSnapshotAfterRun] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsErr, setSnapshotsErr] = useState<string | null>(null);
  const [copySummaryMsg, setCopySummaryMsg] = useState<string | null>(null);
  const [reportGenSeconds, setReportGenSeconds] = useState(0);
  const [deckPendencias, setDeckPendencias] = useState<DeckPendingRow[]>(createInitialPendingRows);
  const [deckRiscos, setDeckRiscos] = useState<DeckRiskRow[]>(createInitialRiskRows);

  useEffect(() => {
    if (!report) {
      setDeckPendencias(createInitialPendingRows());
      setDeckRiscos(createInitialRiskRows());
    }
  }, [report]);

  const refreshSavedFilters = useCallback(async () => {
    setSavedFiltersLoading(true);
    setSavedFiltersErr(null);
    try {
      const res = await fetch("/api/saved-filters");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao listar filtros guardados");
      setSavedFilters(data.items ?? []);
    } catch (e) {
      setSavedFiltersErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavedFiltersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSavedFilters();
  }, [refreshSavedFilters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProjects(true);
      setProjectErr(null);
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao carregar projetos");
        if (!cancelled) setProjects(data.projects ?? []);
      } catch (e) {
        if (!cancelled) setProjectErr(e instanceof Error ? e.message : "Erro");
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAreas = useCallback(async () => {
    if (!project) return;
    setLoadingAreas(true);
    setAreaErr(null);
    try {
      const res = await fetch(`/api/areas?project=${encodeURIComponent(project)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar áreas");
      const paths = data.paths ?? [];
      setAreas(paths);
      setSelectedAreas((prev) => prev.filter((p) => paths.includes(p)));
    } catch (e) {
      setAreaErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoadingAreas(false);
    }
  }, [project]);

  const loadIterations = useCallback(async () => {
    if (!project) return;
    setLoadingIters(true);
    setIterErr(null);
    try {
      const res = await fetch(`/api/iterations?project=${encodeURIComponent(project)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao carregar iterações");
      const paths = data.paths ?? [];
      setIterations(paths);
      setSelectedIters((prev) => prev.filter((p) => paths.includes(p)));
    } catch (e) {
      setIterErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoadingIters(false);
    }
  }, [project]);

  useEffect(() => {
    if (!project) return;
    void loadAreas();
  }, [project, loadAreas]);

  useEffect(() => {
    if (!project || dateMode !== "iteration") return;
    void loadIterations();
  }, [project, dateMode, loadIterations]);

  useEffect(() => {
    if (!reportLoading) {
      setReportGenSeconds(0);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setReportGenSeconds(Math.floor((Date.now() - t0) / 1000));
    }, 400);
    return () => window.clearInterval(id);
  }, [reportLoading]);

  const refreshSnapshots = useCallback(async (proj: string) => {
    const p = proj.trim();
    if (!p) return;
    setSnapshotsLoading(true);
    setSnapshotsErr(null);
    try {
      const res = await fetch(`/api/report-snapshots?project=${encodeURIComponent(p)}&take=12`);
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Falha ao listar snapshots");
      setSnapshots(data.items ?? []);
    } catch (e) {
      setSnapshotsErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 5 || !report) return;
    void refreshSnapshots(report.filter.project);
  }, [step, report, refreshSnapshots]);

  useEffect(() => {
    if (step !== 5 || !report) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, report]);

  useEffect(() => {
    if (step !== 4 || !project.trim()) return;
    if (types.length === 0) {
      setAvailableStatesMeta([]);
      setSelectedStates([]);
      setStatesErr(null);
      setStatesLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setStatesLoading(true);
      setStatesErr(null);
      try {
        const qs = new URLSearchParams({ project: project.trim(), types: types.join(",") });
        const res = await fetch(appApiUrl(`/api/work-item-states?${qs}`));
        const data = (await res.json()) as { error?: string; states?: { name: string; category: string }[] };
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Falha ao carregar estados");
        const states = data.states ?? [];
        if (cancelled) return;
        setAvailableStatesMeta(states);
        const names = states.map((s) => s.name);
        const restore = wizardStateRestoreRef.current;
        wizardStateRestoreRef.current = null;
        if (restore?.length) {
          const v = restore.filter((x) => names.includes(x));
          setSelectedStates(v.length ? v : names);
        } else {
          setSelectedStates(names);
        }
      } catch (e) {
        if (!cancelled) {
          setStatesErr(e instanceof Error ? e.message : "Erro");
          setAvailableStatesMeta([]);
          setSelectedStates([]);
        }
      } finally {
        if (!cancelled) setStatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, project, types]);

  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => a.toLowerCase().includes(q));
  }, [areas, areaSearch]);

  const filteredIters = useMemo(() => {
    const q = iterSearch.trim().toLowerCase();
    if (!q) return iterations;
    return iterations.filter((a) => a.toLowerCase().includes(q));
  }, [iterations, iterSearch]);

  const roadmapGrouped = useMemo(() => {
    if (!report) return [] as { areaPath: string; rows: RoadmapRow[] }[];
    return groupRoadmapBySelectedAreas(report.roadmap, report.filter.areaPaths);
  }, [report]);

  function toggleArea(p: string) {
    setSelectedAreas((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function toggleIter(p: string) {
    setSelectedIters((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function toggleType(t: WorkItemTypeName) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function toggleStateSelection(name: string) {
    setSelectedStates((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  function selectAllStates() {
    setSelectedStates(availableStatesMeta.map((s) => s.name));
  }

  function buildWizardPayload(): SavedWizardPayload {
    return {
      version: FILTER_PAYLOAD_VERSION,
      project,
      selectedAreas,
      dateMode,
      selectedIters,
      targetStart,
      targetEnd,
      types,
      selectedStates:
        availableStatesMeta.length > 0 && selectedStates.length < availableStatesMeta.length
          ? selectedStates
          : undefined,
    };
  }

  function applyWizardPayload(p: SavedWizardPayload) {
    setReport(null);
    setReportErr(null);
    setSaveFilterErr(null);
    setSavedFilterSelect("");
    setProject(p.project);
    setSelectedAreas(p.selectedAreas);
    setDateMode(p.dateMode);
    setSelectedIters(p.selectedIters);
    setTargetStart(p.targetStart);
    setTargetEnd(p.targetEnd);
    const nextTypes = p.types.filter(isWorkItemTypeName);
    setTypes(nextTypes.length > 0 ? nextTypes : [...WORK_ITEM_TYPES]);
    wizardStateRestoreRef.current =
      p.selectedStates !== undefined && p.selectedStates.length > 0 ? [...p.selectedStates] : null;
    setAreaSearch("");
    setIterSearch("");
    setStep(2);
  }

  async function saveCurrentFilter() {
    const name = saveFilterName.trim();
    if (!name) {
      setSaveFilterErr("Indica um nome para o filtro.");
      return;
    }
    if (!project.trim()) {
      setSaveFilterErr("Seleciona um projeto antes de guardar.");
      return;
    }
    setSaveFilterErr(null);
    setSaveFilterBusy(true);
    try {
      const res = await fetch("/api/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payload: buildWizardPayload() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Falha ao guardar");
      setSaveFilterName("");
      await refreshSavedFilters();
    } catch (e) {
      setSaveFilterErr(e instanceof Error ? e.message : "Erro ao guardar");
    } finally {
      setSaveFilterBusy(false);
    }
  }

  function onSelectSavedFilter(id: string) {
    setSavedFilterSelect(id);
    if (!id) return;
    const row = savedFilters.find((r) => r.id === id);
    if (!row?.payload || !isSavedWizardPayload(row.payload)) {
      setSaveFilterErr("Este filtro guardado é inválido ou está corrompido.");
      setSavedFilterSelect("");
      return;
    }
    setSaveFilterErr(null);
    applyWizardPayload(row.payload);
  }

  async function runReport() {
    setReportErr(null);
    setReport(null);
    const allNames = availableStatesMeta.map((s) => s.name);
    const nameSet = new Set(allNames);
    const allStatesSelected =
      allNames.length > 0 &&
      selectedStates.length === allNames.length &&
      selectedStates.every((s) => nameSet.has(s));
    const body: ReportFilterInput = {
      project,
      areaPaths: selectedAreas,
      dateMode,
      workItemTypes: types,
      iterationPaths: dateMode === "iteration" ? selectedIters : undefined,
      targetDateStart: dateMode === "targetDate" ? targetStart : undefined,
      targetDateEnd: dateMode === "targetDate" ? targetEnd : undefined,
      states:
        !statesErr && allNames.length > 0 && !allStatesSelected && selectedStates.length > 0
          ? selectedStates
          : undefined,
    };
    setReportLoading(true);
    try {
      const res = await fetch(appApiUrl("/api/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          res.ok
            ? "Resposta inválida do servidor (não é JSON). Verifique o terminal onde corre o Next.js."
            : `HTTP ${res.status}: ${text.slice(0, 280)}`,
        );
      }
      if (!res.ok) {
        const d = data as { error?: unknown; details?: unknown };
        const msg =
          typeof d.error === "string"
            ? d.error
            : JSON.stringify(d.details ?? d.error ?? res.statusText);
        throw new Error(msg);
      }
      const nextReport = data as ReportResult;
      setReport(nextReport);
      setResultTab("consolidado");
      setStep(5);
      if (saveSnapshotAfterRun) {
        try {
          const sr = await fetch("/api/report-snapshots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: nextReport.filter.project,
              label: null,
              kpis: buildReportKpiPayload(nextReport),
            }),
          });
          if (sr.ok) await refreshSnapshots(nextReport.filter.project);
        } catch {
          /* snapshot opcional */
        }
      }
    } catch (e) {
      if (isLikelyNetworkFetchFailure(e)) {
        setReportErr(
          "Não foi possível contactar o servidor da aplicação (rede). Confirme que o Next.js está a correr (ex.: npm run dev) e que abre o site no mesmo URL (ex.: http://localhost:3000). VPN, proxy ou firewall podem bloquear pedidos locais.",
        );
      } else {
        setReportErr(e instanceof Error ? e.message : "Erro");
      }
    } finally {
      setReportLoading(false);
    }
  }

  const canStep2 = !!project;
  const canStep3 = selectedAreas.length > 0;
  const canStep4 =
    dateMode === "iteration"
      ? selectedIters.length > 0
      : !!(targetStart && targetEnd);
  const stateSelectionInvalid =
    availableStatesMeta.length > 0 && selectedStates.length === 0;
  const canRun =
    types.length > 0 && canStep2 && canStep3 && canStep4 && !stateSelectionInvalid;

  function buildExecutiveSummaryText(r: ReportResult): string {
    const c = r.consolidated;
    const f = r.filter;
    const vel = getExecutiveVelocity(r);
    const dateLine =
      f.dateMode === "iteration"
        ? `Iterações: ${(f.iterationPaths ?? []).length} path(s)`
        : `Target Date: ${f.targetDateStart} → ${f.targetDateEnd}`;
    return [
      `Delivery Follow-up — ${f.project}`,
      `Tipos: ${f.workItemTypes.join(", ")}`,
      f.states?.length ? `Estados: ${f.states.join(", ")}` : "Estados: (todos)",
      dateLine,
      `Áreas (WIQL): ${f.areaPaths.length} root(s)`,
      "",
      "Resumo executivo:",
      `- Total: ${c.total} | Closed: ${c.closed} | Active: ${c.active} | New: ${c.new}`,
      `- Taxa conclusão: ${pct(c.completionRate)}`,
      `- Velocity: ${vel.headline} — ${vel.detail}`,
      "",
      "(Atrasadas e features: ver separador Consolidado.)",
    ].join("\n");
  }

  async function copyExecutiveSummary() {
    if (!report) return;
    setCopySummaryMsg(null);
    try {
      await navigator.clipboard.writeText(buildExecutiveSummaryText(report));
      setCopySummaryMsg("Copiado para a área de transferência.");
      window.setTimeout(() => setCopySummaryMsg(null), 2500);
    } catch {
      setCopySummaryMsg("Não foi possível copiar (permissão do browser).");
    }
  }

  function exportRoadmap() {
    if (!report) return;
    const rows: Record<string, string | number>[] = [];
    for (const g of roadmapGrouped) {
      for (const r of g.rows) {
        rows.push({
          "Grupo (Area Path filtro)": g.areaPath,
          ID: r.id,
          "Work Item": r.workItemType,
          Status: r.state,
          "Progresso (%)":
            r.progressPercent == null ? "" : r.progressPercent,
          "Target Date": r.targetDate,
          Title: r.title,
          Tags: r.tags,
          "Start Date": r.startDate,
          "Committed date": r.committedDate,
          "Area Path (item)": r.areaPath,
          "Iteration Path": r.iterationPath,
        });
      }
    }
    downloadCsv(rows, `roadmap-${report.filter.project}.csv`);
  }

  return (
    <div className="appShell">
      <header className="trPageHeader">
        <div className="trBrandMark">Thomson Reuters</div>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem" }}>Delivery Follow-up</h1>
        <p className="muted" style={{ margin: 0 }}>
          Organização{" "}
          <a href={`https://dev.azure.com/${ADO_ORG}`} target="_blank" rel="noreferrer">
            dev.azure.com/{ADO_ORG}
          </a>
          . Iterações são do projeto; o recorte por área aplica-se na consulta (WIQL), como no Azure
          DevOps.
        </p>
      </header>

      <div className="panel">
        <div className="stepTitle">Filtros guardados (base local SQLite)</div>
        <p className="muted" style={{ marginTop: 0 }}>
          Guarda a configuração atual do assistente ou carrega uma guardada antes (projeto, áreas, datas,
          tipos).
        </p>
        {savedFiltersErr && <p className="error">{savedFiltersErr}</p>}
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 200px", minWidth: 0 }}>
            <span className="muted" style={{ fontSize: "0.85rem", display: "block", marginBottom: 4 }}>
              Carregar filtro
            </span>
            <select
              className="search"
              value={savedFilterSelect}
              onChange={(e) => onSelectSavedFilter(e.target.value)}
              disabled={savedFiltersLoading || savedFilters.length === 0}
            >
              <option value="">
                {savedFiltersLoading ? "A carregar…" : savedFilters.length === 0 ? "— Nenhum guardado —" : "— Escolher —"}
              </option>
              {savedFilters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: "1 1 180px", minWidth: 0 }}>
            <span className="muted" style={{ fontSize: "0.85rem", display: "block", marginBottom: 4 }}>
              Nome para guardar o estado atual
            </span>
            <input
              className="search"
              type="text"
              placeholder="ex.: Sprint X – equipa Y"
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              maxLength={200}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={saveFilterBusy || !project.trim()}
            onClick={() => void saveCurrentFilter()}
          >
            {saveFilterBusy ? "A guardar…" : "Guardar filtro"}
          </button>
        </div>
        {saveFilterErr && <p className="error" style={{ marginBottom: 0 }}>{saveFilterErr}</p>}
      </div>

      {step < 5 && (
        <>
          <div className="panel">
            <div className="stepTitle">1. Projeto / produto</div>
            {loadingProjects ? (
              <p className="muted">Carregando projetos…</p>
            ) : projectErr ? (
              <p className="error">{projectErr}</p>
            ) : (
              <select
                className="search"
                value={project}
                onChange={(e) => {
                  const v = e.target.value;
                  setProject(v);
                  setStep(1);
                  setSelectedAreas([]);
                  setSelectedIters([]);
                  setAreas([]);
                  setIterations([]);
                }}
              >
                <option value="">Selecione um projeto…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <div className="row">
              <button className="btn" type="button" disabled={!canStep2} onClick={() => setStep(2)}>
                Continuar
              </button>
            </div>
          </div>

          {step >= 2 && (
            <div className="panel">
              <div className="stepTitle">2. Area Paths (múltipla seleção)</div>
              <p className="muted" style={{ marginTop: 0 }}>
                Todas as area paths do projeto. Use a busca para filtrar a lista.
              </p>
              {loadingAreas ? (
                <p className="muted">Carregando áreas…</p>
              ) : areaErr ? (
                <p className="error">{areaErr}</p>
              ) : (
                <>
                  <input
                    className="search"
                    placeholder="Filtrar area path…"
                    value={areaSearch}
                    onChange={(e) => setAreaSearch(e.target.value)}
                  />
                  <div className="listScroll">
                    {filteredAreas.map((a) => (
                      <label key={a}>
                        <input
                          type="checkbox"
                          checked={selectedAreas.includes(a)}
                          onChange={() => toggleArea(a)}
                        />
                        <span>{a}</span>
                      </label>
                    ))}
                  </div>
                  <p className="muted">
                    Selecionadas: {selectedAreas.length}{" "}
                    <button type="button" className="btnSecondary btn" onClick={() => setSelectedAreas([])}>
                      Limpar
                    </button>
                  </p>
                </>
              )}
              <div className="row">
                <button className="btnSecondary btn" type="button" onClick={() => setStep(1)}>
                  Voltar
                </button>
                <button className="btn" type="button" disabled={!canStep3} onClick={() => setStep(3)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step >= 3 && (
            <div className="panel">
              <div className="stepTitle">3. Iteration Path ou Target Date</div>
              <div className="row" style={{ marginBottom: "0.75rem" }}>
                <label>
                  <input
                    type="radio"
                    name="dm"
                    checked={dateMode === "iteration"}
                    onChange={() => setDateMode("iteration")}
                  />{" "}
                  Iteration Path
                </label>
                <label>
                  <input
                    type="radio"
                    name="dm"
                    checked={dateMode === "targetDate"}
                    onChange={() => setDateMode("targetDate")}
                  />{" "}
                  Target Date (intervalo)
                </label>
              </div>

              {dateMode === "iteration" ? (
                <>
                  {loadingIters ? (
                    <p className="muted">Carregando iterações…</p>
                  ) : iterErr ? (
                    <p className="error">{iterErr}</p>
                  ) : (
                    <>
                      <input
                        className="search"
                        placeholder="Filtrar iteration path…"
                        value={iterSearch}
                        onChange={(e) => setIterSearch(e.target.value)}
                      />
                      <div className="listScroll">
                        {filteredIters.map((a) => (
                          <label key={a}>
                            <input
                              type="checkbox"
                              checked={selectedIters.includes(a)}
                              onChange={() => toggleIter(a)}
                            />
                            <span>{a}</span>
                          </label>
                        ))}
                      </div>
                      <p className="muted">
                        Selecionadas: {selectedIters.length}{" "}
                        <button
                          type="button"
                          className="btnSecondary btn"
                          onClick={() => setSelectedIters([])}
                        >
                          Limpar
                        </button>
                      </p>
                    </>
                  )}
                </>
              ) : (
                <div className="grid2">
                  <label>
                    Data inicial
                    <input type="date" value={targetStart} onChange={(e) => setTargetStart(e.target.value)} />
                  </label>
                  <label>
                    Data final
                    <input type="date" value={targetEnd} onChange={(e) => setTargetEnd(e.target.value)} />
                  </label>
                </div>
              )}

              <div className="row">
                <button className="btnSecondary btn" type="button" onClick={() => setStep(2)}>
                  Voltar
                </button>
                <button className="btn" type="button" disabled={!canStep4} onClick={() => setStep(4)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step >= 4 && (
            <div className="panel">
              <div className="stepTitle">4. Work item types</div>
              <div className="grid2">
                {WORK_ITEM_TYPES.map((t) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() => toggleType(t)}
                    />{" "}
                    {t}
                  </label>
                ))}
              </div>

              <div className="stepTitle" style={{ marginTop: "1rem" }}>
                Estados (System.State)
              </div>
              <p className="muted" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                Estados definidos no processo para os tipos seleccionados. Desmarca os que queres{" "}
                <strong>excluir</strong> do relatório. Com todos marcados, não há filtro por estado na WIQL.
              </p>
              {statesLoading ? (
                <p className="muted">A carregar estados…</p>
              ) : statesErr ? (
                <p className="error">{statesErr}</p>
              ) : availableStatesMeta.length === 0 ? (
                <p className="muted">Nenhum estado devolvido (verifica tipos e permissões PAT).</p>
              ) : (
                <>
                  <div className="row" style={{ marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.35rem" }}>
                    <button type="button" className="btnSecondary btn" onClick={selectAllStates}>
                      Marcar todos
                    </button>
                    <span className="muted">
                      Incluídos na WIQL: {selectedStates.length} / {availableStatesMeta.length}
                    </span>
                  </div>
                  <div className="listScroll" style={{ maxHeight: "12rem" }}>
                    {availableStatesMeta.map((s) => (
                      <label key={s.name} style={{ display: "block" }}>
                        <input
                          type="checkbox"
                          checked={selectedStates.includes(s.name)}
                          onChange={() => toggleStateSelection(s.name)}
                        />{" "}
                        {s.name}
                        {s.category ? (
                          <span className="muted" style={{ fontSize: "0.85rem" }}>
                            {" "}
                            ({s.category})
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {reportErr && <p className="error">{reportErr}</p>}
              <label style={{ display: "block", marginTop: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={saveSnapshotAfterRun}
                  onChange={(e) => setSaveSnapshotAfterRun(e.target.checked)}
                />{" "}
                Após gerar, guardar snapshot de KPIs (base local SQLite)
              </label>
              <div className="row" style={{ marginTop: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <button className="btnSecondary btn" type="button" onClick={() => setStep(3)}>
                  Voltar
                </button>
                <button className="btn" type="button" disabled={!canRun || reportLoading} onClick={runReport}>
                  {reportLoading ? `A gerar… (${reportGenSeconds}s)` : "Gerar relatório"}
                </button>
              </div>
              {reportLoading ? (
                <p className="muted" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                  A aguardar resposta do Azure DevOps (consulta WIQL e campos)…
                </p>
              ) : null}
            </div>
          )}
        </>
      )}

      {step === 5 && report && (
        <div ref={resultsRef} className="panel">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="trSectionTitle">Resultado — {report.filter.project}</h2>
            <div className="row">
              <button
                type="button"
                className="btnSecondary btn"
                onClick={() => {
                  setReport(null);
                  setReportErr(null);
                  setStep(1);
                }}
              >
                Novo fluxo
              </button>
            </div>
          </div>

          {report.warnings?.length ? (
            <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
              {report.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          <details open style={{ marginBottom: "0.75rem" }}>
            <summary className="muted" style={{ cursor: "pointer", fontWeight: 600 }}>
              Resumo executivo (KPIs)
            </summary>
            <ExecutiveSummaryKpis report={report} />
          </details>

          <div
            className="row"
            style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}
          >
            <button type="button" className="btnSecondary btn" onClick={() => void copyExecutiveSummary()}>
              Copiar resumo
            </button>
            {copySummaryMsg ? <span className="muted" style={{ fontSize: "0.85rem" }}>{copySummaryMsg}</span> : null}
            <span className="muted" style={{ marginLeft: "0.25rem" }}>
              Exportar:
            </span>
            <button type="button" className="btnSecondary btn" onClick={() => downloadReportPdf(report)}>
              PDF
            </button>
            <button
              type="button"
              className="btnSecondary btn"
              title="PowerPoint: ficheiro gerado no servidor (PptxGenJS) com relatório Azure DevOps, KPIs, separadores Consolidado / Roadmap / Análise e métricas, e tabelas «Pendências» e «Riscos» do Consolidado. Não requer ficheiro .pptx modelo no disco."
              onClick={() =>
                void downloadDeliveryMeetingPptx(report, {
                  deckInput: { pendencias: deckPendencias, riscos: deckRiscos },
                }).catch((err: unknown) => {
                  const msg = err instanceof Error ? err.message : String(err);
                  window.alert(`Exportação PowerPoint: ${msg}`);
                })
              }
            >
              PowerPoint
            </button>
          </div>

          <details style={{ marginBottom: "0.75rem" }}>
            <summary className="muted" style={{ cursor: "pointer" }}>
              Como ler este recorte
            </summary>
            <div className="muted" style={{ marginTop: "0.5rem", lineHeight: 1.5 }}>
              <p style={{ marginTop: 0 }}>
                O relatório aplica o filtro de <strong>Area Path</strong> na WIQL (raízes que escolheste) e
                limita por <strong>iteração</strong> ou <strong>Target Date</strong>, conforme o passo 3. Os
                números do consolidado e por área reflectem apenas work items devolvidos por essa consulta.
              </p>
              <p style={{ marginBottom: 0 }}>
                O separador Roadmap agrupa por cada raiz seleccionada; um item aparece no primeiro grupo em
                que o seu Area Path encaixa por prefixo.
              </p>
            </div>
          </details>

          <details style={{ marginBottom: "0.75rem" }}>
            <summary className="muted" style={{ cursor: "pointer" }}>
              Glossário: New / Active / Closed (Azure DevOps)
            </summary>
            <ul className="muted" style={{ marginTop: "0.5rem", lineHeight: 1.55, paddingLeft: "1.2rem" }}>
              <li>{STATE_BUCKET_GLOSSARY_PT.new}</li>
              <li>{STATE_BUCKET_GLOSSARY_PT.active}</li>
              <li>{STATE_BUCKET_GLOSSARY_PT.closed}</li>
            </ul>
          </details>

          <details style={{ marginBottom: "0.75rem" }}>
            <summary className="muted" style={{ cursor: "pointer" }}>
              WIQL usada
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "0.78rem",
                background: "var(--bg)",
                padding: "0.5rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
              }}
            >
              {report.wiql}
            </pre>
          </details>

          <div className="tabs">
            <button
              type="button"
              className={`tab ${resultTab === "consolidado" ? "tabActive" : ""}`}
              onClick={() => setResultTab("consolidado")}
            >
              Consolidado
            </button>
            <button
              type="button"
              className={`tab ${resultTab === "roadmap" ? "tabActive" : ""}`}
              onClick={() => setResultTab("roadmap")}
            >
              Roadmap
            </button>
            <button
              type="button"
              className={`tab ${resultTab === "analises" ? "tabActive" : ""}`}
              onClick={() => setResultTab("analises")}
            >
              Análises e Métricas
            </button>
          </div>

          {report.consolidated.total === 0 ? (
            <p
              className="muted"
              style={{
                marginBottom: "0.75rem",
                padding: "0.65rem 0.75rem",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--bg)",
              }}
            >
              Nenhum work item encontrado para este filtro. Confirme áreas, iteração ou intervalo de Target Date,
              tipos e filtro de estados.
            </p>
          ) : null}

          {resultTab === "consolidado" && (
            <div>
              <p className="muted">
                Recorte: tipos {report.filter.workItemTypes.join(", ")}
                {report.filter.states?.length ? (
                  <> — estados {report.filter.states.join(", ")}</>
                ) : null}{" "}
                —{" "}
                {report.filter.dateMode === "iteration"
                  ? `Iteration: ${report.filter.iterationPaths?.length ?? 0} path(s)`
                  : `Target Date: ${report.filter.targetDateStart} → ${report.filter.targetDateEnd}`}
              </p>
              <h3 className="trSectionTitle" style={{ marginTop: "0.85rem", marginBottom: 0 }}>
                Visão por área — work items
              </h3>
              <AreaPathConsolidadoGrid areas={report.byArea} />
              <LastMeetingPendingCard rows={deckPendencias} onRowsChange={setDeckPendencias} />
              <RisksActionPlanCard rows={deckRiscos} onRowsChange={setDeckRiscos} />
            </div>
          )}

          {resultTab === "roadmap" && (
            <div>
              <div className="row" style={{ marginBottom: "0.5rem" }}>
                <button type="button" className="btnSecondary btn" onClick={exportRoadmap}>
                  Exportar CSV
                </button>
                <span className="pill">{report.roadmap.length} linhas</span>
              </div>
              <p className="muted" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
                Agrupado por cada Area Path selecionada no filtro (itens aplicam-se ao primeiro grupo em que
                encaixam).
              </p>
              {roadmapGrouped.map((group) => (
                <div key={group.areaPath} style={{ marginBottom: "1.25rem" }}>
                  <div
                    className="row"
                    style={{
                      marginBottom: "0.35rem",
                      alignItems: "baseline",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3 className="roadmapGroupTitle">{group.areaPath}</h3>
                    <span className="pill">{group.rows.length} itens</span>
                  </div>
                  {group.rows.length === 0 ? (
                    <div className="tableWrap">
                      <table className="data">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Work Item</th>
                            <th>Status</th>
                            <th>Progresso</th>
                            <th>Target Date</th>
                            <th>Title</th>
                            <th>Tags</th>
                            <th>Start Date</th>
                            <th>Committed date</th>
                            <th>Area Path (item)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={10} className="muted" style={{ textAlign: "center", padding: "0.85rem" }}>
                              Nenhum work item neste agrupamento.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="tableWrap">
                      <table className="data">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Work Item</th>
                            <th>Status</th>
                            <th>Progresso</th>
                            <th>Target Date</th>
                            <th>Title</th>
                            <th>Tags</th>
                            <th>Start Date</th>
                            <th>Committed date</th>
                            <th>Area Path (item)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <a
                                  href={`https://dev.azure.com/${encodeURIComponent(ADO_ORG)}/${encodeURIComponent(report.filter.project)}/_workitems/edit/${r.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {r.id}
                                </a>
                              </td>
                              <td>{r.workItemType}</td>
                              <td>{r.state}</td>
                              <td>
                                <WorkItemProgressBar percent={r.progressPercent} />
                              </td>
                              <td>{r.targetDate}</td>
                              <td>{r.title}</td>
                              <td>{r.tags}</td>
                              <td>{r.startDate}</td>
                              <td>{r.committedDate}</td>
                              <td>{r.areaPath}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {resultTab === "analises" && (
            <AnalyticsChartsPanel report={report} adoOrg={ADO_ORG} />
          )}

          <div
            style={{
              marginTop: "1.5rem",
              borderTop: "1px solid var(--border)",
              paddingTop: "1rem",
            }}
          >
            <h3 className="trSectionTitle" style={{ fontSize: "1.05rem", marginTop: 0 }}>
              Histórico de snapshots (KPIs, base local)
            </h3>
            <p className="muted" style={{ marginTop: "0.25rem", fontSize: "0.88rem" }}>
              Marca &quot;Após gerar, guardar snapshot&quot; no passo 4 para gravar cada execução. Delta =
              comparação com o snapshot imediatamente anterior na lista.
            </p>
            {snapshotsErr ? <p className="error">{snapshotsErr}</p> : null}
            {snapshotsLoading ? <p className="muted">A carregar…</p> : null}
            {!snapshotsLoading && snapshots.length === 0 ? (
              <p className="muted">Ainda não há snapshots para este projeto.</p>
            ) : null}
            <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0" }}>
              {snapshots.map((snap, idx) => {
                const nextOlder = snapshots[idx + 1];
                const k = isReportKpiPayload(snap.kpis) ? snap.kpis : null;
                const prevK = nextOlder && isReportKpiPayload(nextOlder.kpis) ? nextOlder.kpis : null;
                const dt = new Date(snap.createdAt);
                const dateStr = Number.isNaN(dt.getTime())
                  ? snap.createdAt
                  : dt.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
                return (
                  <li
                    key={snap.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "0.65rem 0.75rem",
                      marginBottom: "0.5rem",
                      background: "var(--bg)",
                    }}
                  >
                    <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "0.35rem" }}>
                      <strong>{dateStr}</strong>
                      {snap.label ? <span className="pill">{snap.label}</span> : null}
                    </div>
                    {k ? (
                      <div className="muted" style={{ fontSize: "0.82rem", marginTop: "0.35rem", lineHeight: 1.45 }}>
                        Total: <strong>{k.total}</strong>
                        {prevK ? (
                          <span>
                            {" "}
                            (Δ vs anterior: {formatDelta(prevK.total, k.total)})
                          </span>
                        ) : null}
                        {" · "}
                        Closed: <strong>{k.closed}</strong>
                        {prevK ? <span> (Δ {formatDelta(prevK.closed, k.closed)})</span> : null}
                        {" · "}
                        Atrasadas: <strong>{k.overdue}</strong>
                        {prevK ? <span> (Δ {formatDelta(prevK.overdue, k.overdue)})</span> : null}
                        {" · "}
                        Conclusão: <strong>{pct(k.completionRate)}</strong>
                        {prevK ? (
                          <span> (Δ {formatDelta(prevK.completionRate, k.completionRate, true)})</span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
                        KPIs inválidos neste registo.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
