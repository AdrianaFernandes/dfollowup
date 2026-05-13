import { ADO_API_VERSION, DEFAULT_ORG } from "./constants";

function getPat(): string {
  const pat = process.env.AZURE_DEVOPS_PAT?.trim();
  if (!pat) {
    throw new Error(
      "AZURE_DEVOPS_PAT is not set. Copy .env.example to .env.local and add your PAT.",
    );
  }
  return pat;
}

function getOrg(): string {
  return (process.env.AZURE_DEVOPS_ORG?.trim() || DEFAULT_ORG).replace(/^\/+/, "");
}

export function getAdoBaseUrl(): string {
  const org = getOrg();
  return `https://dev.azure.com/${org}`;
}

export async function adoFetch<T>(
  path: string,
  init?: RequestInit & { parseJson?: true },
): Promise<T> {
  const base = getAdoBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const pat = getPat();
  const auth = Buffer.from(`:${pat}`).toString("base64");
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ADO ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

export function withApiVersion(search: string): string {
  const sep = search.includes("?") ? "&" : "?";
  return `${search}${sep}api-version=${ADO_API_VERSION}`;
}
