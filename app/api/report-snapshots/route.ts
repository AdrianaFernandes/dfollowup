import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const kpiSchema = z.object({
  total: z.number(),
  closed: z.number(),
  active: z.number(),
  new: z.number(),
  overdue: z.number(),
  featureTotal: z.number(),
  completionRate: z.number(),
  efficiencyRate: z.number().nullable(),
  throughputClosed: z.number(),
  leadTimeMedian: z.number().nullable(),
});

const postSchema = z.object({
  project: z.string().min(1).max(300),
  label: z.string().max(200).optional().nullable(),
  kpis: kpiSchema,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const project = searchParams.get("project")?.trim();
    const takeRaw = searchParams.get("take");
    const take = Math.min(50, Math.max(1, takeRaw ? parseInt(takeRaw, 10) || 15 : 15));
    if (!project) {
      return NextResponse.json({ error: "Query project é obrigatória" }, { status: 400 });
    }
    const rows = await prisma.reportSnapshot.findMany({
      where: { project },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, project: true, label: true, kpis: true, createdAt: true },
    });
    const items = rows.map((r) => ({
      ...r,
      kpis: (() => {
        try {
          return JSON.parse(r.kpis) as unknown;
        } catch {
          return null;
        }
      })(),
    }));
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar snapshots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await prisma.reportSnapshot.create({
      data: {
        project: parsed.data.project.trim(),
        label: parsed.data.label?.trim() || null,
        kpis: JSON.stringify(parsed.data.kpis),
      },
    });
    return NextResponse.json({ id: row.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao guardar snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
