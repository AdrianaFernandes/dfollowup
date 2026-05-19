import type { ReportResult } from "@/lib/ado/report";
import { safeFilenamePart } from "@/lib/deliveryMeetingPptxShared";

function deliveryPptxApiUrl(): string {
  if (typeof window === "undefined") return "/api/export/delivery-pptx";
  return new URL("/api/export/delivery-pptx", window.location.origin).href;
}

/**
 * Exporta o deck usando o modelo .pptx (marcadores `{{DF_*}}` substituídos no servidor).
 */
export async function downloadDeliveryMeetingPptx(
  report: ReportResult,
  options?: { filename?: string },
): Promise<void> {
  const res = await fetch(deliveryPptxApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report }),
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { message?: string };
      if (typeof err?.message === "string") message = err.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const base = report.filter.project ? safeFilenamePart(report.filter.project) : "delivery";
  const name = options?.filename ?? `delivery-followup-${base}.pptx`;
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
