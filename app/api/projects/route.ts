import { NextResponse } from "next/server";
import { listAllProjects } from "@/lib/ado/projects";

export async function GET() {
  try {
    const projects = await listAllProjects();
    return NextResponse.json({ projects });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar projetos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
