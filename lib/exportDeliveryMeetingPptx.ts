"use client";

import type { ReportResult } from "@/lib/ado/report";
import { safeFilenamePart } from "@/lib/deliveryMeetingPptxShared";
import { downloadDeliveryMeetingPptxProgrammatic } from "@/lib/exportDeliveryMeetingPptxProgrammatic";

function parseFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  return m?.[1]?.replace(/"/g, "") ?? null;
}

function deliveryPptxApiUrl(): string {
  if (typeof window === "undefined") return "/api/export/delivery-pptx";
  return new URL("/api/export/delivery-pptx", window.location.origin).href;
}

/**
 * Exporta o deck de reunião delivery. Se existir `templates/delivery-meeting-template.pptx`,
 * usa o servidor (pptx-automizer) para substituir marcadores `{{DF_*}}`. Caso contrário,
 * gera o deck programático (PptxGenJS) como antes.
 */
export async function downloadDeliveryMeetingPptx(
  report: ReportResult | null,
  options?: { filename?: string; meetingDate?: Date },
) {
  const when = options?.meetingDate ?? new Date();
  const defaultName =
    options?.filename ??
    `delivery-followup-25-${report?.filter.project ? safeFilenamePart(report.filter.project) : "delivery"}.pptx`;

  try {
    const res = await fetch(deliveryPptxApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report,
        meetingDate: when.toISOString(),
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const fromHeader = parseFilenameFromContentDisposition(res.headers.get("Content-Disposition"));
      const fileName = fromHeader ?? defaultName;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return;
    }

    if (res.status !== 404) {
      console.warn("[delivery-pptx] API returned", res.status, "— fallback to programmatic deck.");
    }
  } catch (e) {
    console.warn("[delivery-pptx] fetch failed — fallback to programmatic.", e);
  }

  await downloadDeliveryMeetingPptxProgrammatic(report, options);
}
