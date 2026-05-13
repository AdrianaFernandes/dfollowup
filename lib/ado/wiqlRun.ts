import { adoFetch } from "./client";
import { ADO_API_VERSION } from "./constants";

type WiqlResponse = {
  workItems?: { id: number; url?: string }[];
  asOf?: string;
};

export async function runWiql(project: string, wiql: string, top = 20000): Promise<number[]> {
  const enc = encodeURIComponent(project);
  const path = `/${enc}/_apis/wit/wiql?$top=${top}&api-version=${ADO_API_VERSION}`;
  const body = await adoFetch<WiqlResponse>(path, {
    method: "POST",
    body: JSON.stringify({ query: wiql }),
  });
  return (body.workItems ?? []).map((w) => w.id);
}
