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
    const cached = await getCachedClassification(org, project, "areas");
    if (cached) {
      return NextResponse.json({ paths: cached, cached: true });
    }
    const tree = await fetchClassificationTree(project, "Areas");
    const paths = flattenClassificationPaths(tree);
    await setCachedClassification(org, project, "areas", paths);
    return NextResponse.json({ paths, cached: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar áreas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
