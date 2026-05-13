export function getOrgSlug(): string {
  return (process.env.AZURE_DEVOPS_ORG?.trim() || "tr-ggo").replace(/^\/+/, "");
}
