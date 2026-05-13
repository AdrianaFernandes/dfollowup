import { adoFetch, withApiVersion } from "./client";

export type ProjectRow = {
  id: string;
  name: string;
  state?: string;
};

type ProjectsPage = {
  value: { id: string; name: string; state?: string }[];
  continuationToken?: string | null;
};

export async function listAllProjects(): Promise<ProjectRow[]> {
  const all: ProjectRow[] = [];
  let continuationToken: string | undefined;

  do {
    let path = `/_apis/projects?stateFilter=wellFormed&$top=100`;
    if (continuationToken) {
      path += `&continuationToken=${encodeURIComponent(continuationToken)}`;
    }
    const page = await adoFetch<ProjectsPage>(withApiVersion(path));
    for (const p of page.value ?? []) {
      all.push({ id: p.id, name: p.name, state: p.state });
    }
    continuationToken = page.continuationToken ?? undefined;
  } while (continuationToken);

  all.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return all;
}
