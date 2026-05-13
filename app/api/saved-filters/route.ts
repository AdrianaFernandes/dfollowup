import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  payload: z.unknown(),
});

export async function GET() {
  try {
    const rows = await prisma.savedFilter.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, name: true, payload: true, createdAt: true },
    });
    const items = rows.map((r) => ({
      ...r,
      payload: (() => {
        try {
          return JSON.parse(r.payload) as unknown;
        } catch {
          return null;
        }
      })(),
    }));
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar filtros";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await prisma.savedFilter.create({
      data: {
        name: parsed.data.name.trim(),
        payload: JSON.stringify(parsed.data.payload),
      },
    });
    return NextResponse.json({ id: row.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao salvar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
