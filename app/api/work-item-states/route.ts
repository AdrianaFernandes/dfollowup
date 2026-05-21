import { NextResponse } from "next/server";
import { WORK_ITEM_TYPES, type WorkItemTypeName } from "@/lib/ado/filters";
import { fetchDistinctWorkItemStates } from "@/lib/ado/states";

function isWorkItemTypeName(t: string): t is WorkItemTypeName {
  return (WORK_ITEM_TYPES as readonly string[]).includes(t);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project")?.trim();
  const typesRaw = searchParams.get("types")?.trim();
  if (!project) {
    return NextResponse.json({ error: "Parâmetro project obrigatório" }, { status: 400 });
  }
  if (!typesRaw) {
    return NextResponse.json({ error: "Parâmetro types obrigatório (ex.: Epic,Feature)" }, { status: 400 });
  }
  const types = typesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter(isWorkItemTypeName);
  if (!types.length) {
    return NextResponse.json({ error: "Nenhum tipo de work item válido na lista" }, { status: 400 });
  }
  try {
    const states = await fetchDistinctWorkItemStates(project, types);
    return NextResponse.json({ states });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar estados";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
