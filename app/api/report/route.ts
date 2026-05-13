import { NextResponse } from "next/server";
import { runDeliveryReport } from "@/lib/ado/runReport";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await runDeliveryReport(body);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status },
      );
    }
    return NextResponse.json(result.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro no relatório";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
