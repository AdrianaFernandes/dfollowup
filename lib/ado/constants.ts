export const ADO_API_VERSION = "7.1";
export const DEFAULT_ORG = "tr-ggo";

export const ROADMAP_FIELD_REFS = [
  "System.Id",
  "System.WorkItemType",
  "System.State",
  "Microsoft.VSTS.Scheduling.TargetDate",
  "System.Title",
  "System.Tags",
  "Microsoft.VSTS.Scheduling.StartDate",
  "Custom.CommittedDate",
  "System.AreaPath",
  "System.IterationPath",
  "System.CreatedDate",
  "Microsoft.VSTS.Common.ClosedDate",
  "System.Parent",
  "Microsoft.VSTS.Scheduling.StoryPoints",
] as const;

export const COMMITTED_DATE_REF = "Custom.CommittedDate";
