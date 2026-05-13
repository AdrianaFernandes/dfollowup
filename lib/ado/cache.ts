import { prisma } from "@/lib/db";

const DEFAULT_TTL_MS = 1000 * 60 * 30;

export async function getCachedClassification(
  org: string,
  projectId: string,
  kind: "areas" | "iterations",
): Promise<string[] | null> {
  const row = await prisma.classificationCache.findFirst({
    where: {
      org,
      projectId,
      kind,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as string[];
  } catch {
    return null;
  }
}

export async function setCachedClassification(
  org: string,
  projectId: string,
  kind: "areas" | "iterations",
  paths: string[],
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.classificationCache.create({
    data: {
      org,
      projectId,
      kind,
      payload: JSON.stringify(paths),
      expiresAt,
    },
  });
}
