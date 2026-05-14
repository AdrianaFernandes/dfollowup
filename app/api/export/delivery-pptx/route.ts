import { NextResponse } from "next/server";
import { z } from "zod";
import type { ReportResult } from "@/lib/ado/report";
import { safeFilenamePart } from "@/lib/deliveryMeetingPptxShared";
import {
  deliveryTemplateExists,
  generateDeliveryMeetingPptxFromTemplate,
} from "@/lib/server/deliveryMeetingTemplatePptx";

export const runtime = "nodejs";

const bodySchema = z.object({
  report: z.any().nullable(),
  meetingDate: z.string().optional(),
});

export async function POST(req: Request) {
  if (!deliveryTemplateExists()) {
    return NextResponse.json(
      { error: "MISSING_TEMPLATE", message: "Coloque delivery-meeting-template.pptx em /templates (ver templates/README.md)." },
      { status: 404 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", details: parsed.error.flatten() }, { status: 400 });
  }

  const { report, meetingDate } = parsed.data;
  const when =
    meetingDate && !Number.isNaN(Date.parse(meetingDate)) ? new Date(meetingDate) : new Date();

  try {
    const buf = await generateDeliveryMeetingPptxFromTemplate(report as ReportResult | null, when);
    const base = report?.filter.project ? safeFilenamePart(report.filter.project) : "delivery";
    const filename = `delivery-followup-25-${base}.pptx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[delivery-pptx]", msg);
    return NextResponse.json({ error: "GENERATION_FAILED", message: msg }, { status: 500 });
  }
}
