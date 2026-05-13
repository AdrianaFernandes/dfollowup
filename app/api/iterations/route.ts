import { NextResponse } from "next/server";
import { fetchClassificationTree, flattenClassificationPaths } from "@/lib/ado/classification";
import { getCachedClassification, setCachedClassification } from "@/lib/ado/cache";
import { getOrgSlug } from "@/lib/ado/org";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project")?.trim();
  if (!project) {
    return NextResponse.json({ error: "Parâmetro project obrigatório" }, { status: 400 });
  }
  const org = getOrgSlug();
  try {
    const cached = await getCachedClassification(org, project, "iterations");
    if (cached) {
      return NextResponse.json({ paths: cached, cached: true });
    }
    const tree = await fetchClassificationTree(project, "Iterations");
    const paths = flattenClassificationPaths(tree);
    await setCachedClassification(org, project, "iterations", paths);
    return NextResponse.json({ paths, cached: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar iterações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
