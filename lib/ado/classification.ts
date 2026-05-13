import { adoFetch, withApiVersion } from "./client";

export type ClassificationNode = {
  id?: number;
  name: string;
  structureType?: string;
  hasChildren?: boolean;
  children?: ClassificationNode[];
};

export type ClassificationResponse = {
  id?: number;
  name: string;
  structureType?: string;
  hasChildren?: boolean;
  children?: ClassificationNode[];
};

function collectPaths(node: ClassificationNode, parentPath: string, out: string[]): void {
  const segment = node.name?.trim() || "";
  const path = parentPath ? `${parentPath}\\${segment}` : segment;
  if (segment) {
    out.push(path);
  }
  const kids = node.children;
  if (kids?.length) {
    for (const c of kids) {
      collectPaths(c, path, out);
    }
  }
}

/** Flatten area or iteration tree to full path strings (ADO format with backslashes). */
export function flattenClassificationPaths(root: ClassificationResponse): string[] {
  const out: string[] = [];
  const rootName = (root.name ?? "").trim();
  if (root.children?.length) {
    for (const c of root.children) {
      collectPaths(c, rootName, out);
    }
  } else if (rootName) {
    out.push(rootName);
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function fetchClassificationTree(
  project: string,
  kind: "Areas" | "Iterations",
): Promise<ClassificationResponse> {
  const enc = encodeURIComponent(project);
  const path = `/${enc}/_apis/wit/classificationnodes/${kind}?$depth=14`;
  return adoFetch<ClassificationResponse>(withApiVersion(path));
}
