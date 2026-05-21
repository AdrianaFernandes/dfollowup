import { NextResponse } from "next/server";
import { z } from "zod";
import { reportResultSchema } from "@/lib/ado/reportResultSchema";
import { safeFilenamePart } from "@/lib/deliveryMeetingPptxShared";
import { buildDeliveryMeetingPptxProgrammatic } from "@/lib/exportDeliveryMeetingPptxProgrammatic";

const deckPendingRowSchema = z.object({
  id: z.string(),
  pendencia: z.string(),
  owner: z.string(),
  status: z.string(),
  observacao: z.string(),
});

const deckRiskRowSchema = z.object({
  id: z.string(),
  sev: z.string(),
  risco: z.string(),
  areaAfetada: z.string(),
  planoAcao: z.string(),
  owner: z.string(),
  prazo: z.string(),
});

const deckInputSchema = z.object({
  pendencias: z.array(deckPendingRowSchema),
  riscos: z.array(deckRiskRowSchema),
});

const bodySchema = z.object({
  report: reportResultSchema,
  deckInput: deckInputSchema.optional(),
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
    return NextResponse.json(
      { error: "BAD_BODY", message: parsed.error.message, issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const report = parsed.data.report;
  const deckInput = parsed.data.deckInput;

  try {
    const buf = await buildDeliveryMeetingPptxProgrammatic(report, deckInput ?? null);
    const base =
      report.filter?.project ? safeFilenamePart(report.filter.project) : "delivery";
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
    console.error("[delivery-pptx]", msg);
    return NextResponse.json({ error: "EXPORT_FAILED", message: msg }, { status: 500 });
  }
}
