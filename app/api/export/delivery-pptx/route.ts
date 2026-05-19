import { NextResponse } from "next/server";
import { z } from "zod";
import type { ReportResult } from "@/lib/ado/report";
import { safeFilenamePart } from "@/lib/deliveryMeetingPptxShared";
import { renderDeliveryMeetingPptxFromTemplate } from "@/lib/server/deliveryMeetingTemplatePptx";

const bodySchema = z.object({
  report: z.unknown(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_BODY", message: parsed.error.message }, { status: 400 });
  }

  const report = parsed.data.report as ReportResult | null;

  try {
    const buf = await renderDeliveryMeetingPptxFromTemplate(report);
    const base =
      report && report.filter?.project ? safeFilenamePart(report.filter.project) : "delivery";
    const filename = `delivery-followup-${base}.pptx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("MISSING_TEMPLATE")) {
      return NextResponse.json(
        {
          error: "MISSING_TEMPLATE",
          message:
            "Não foi encontrado nenhum modelo .pptx. Defina DELIVERY_PPT_TEMPLATE_PATH no .env, " +
              "coloque TEMPLEATE.pptx na pasta Downloads, ou delivery-meeting-template.pptx em /templates.",
        },
        { status: 404 },
      );
    }
    console.error("[delivery-pptx]", msg);
    return NextResponse.json({ error: "EXPORT_FAILED", message: msg }, { status: 500 });
  }
}
