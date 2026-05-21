import { z } from "zod";
import { reportFilterSchema } from "@/lib/ado/filters";

const stateBucketSchema = z.enum(["new", "active", "closed"]);

const roadmapRowSchema = z.object({
  id: z.number(),
  workItemType: z.string(),
  state: z.string(),
  stateBucket: stateBucketSchema,
  progressPercent: z.number().nullable(),
  targetDate: z.string(),
  title: z.string(),
  tags: z.string(),
  startDate: z.string(),
  committedDate: z.string(),
  areaPath: z.string(),
  iterationPath: z.string(),
  parentId: z.number().nullable(),
  storyPoints: z.number().nullable(),
  closedDate: z.string(),
});

const consolidatedSchema = z.object({
  total: z.number(),
  closed: z.number(),
  active: z.number(),
  new: z.number(),
  overdue: z.number(),
  featureTotal: z.number(),
  completionRate: z.number(),
  efficiencyRate: z.number().nullable(),
  efficiencyLabel: z.string(),
});

const areaSummarySchema = consolidatedSchema.extend({
  areaPath: z.string(),
});

const mixRowSchema = z.object({
  workItemType: z.string(),
  count: z.number(),
  pct: z.number(),
});

const tagCountSchema = z.object({
  tag: z.string(),
  count: z.number(),
});

const agingItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  workItemType: z.string(),
  daysOpen: z.number(),
  areaPath: z.string(),
});

const overdueByAreaSchema = z.object({
  areaPath: z.string(),
  overdue: z.number(),
});

const leadTimeStatsSchema = z.object({
  median: z.number().nullable(),
  p85: z.number().nullable(),
  sampleSize: z.number(),
});

const analyticsSchema = z.object({
  throughputClosed: z.number(),
  throughputClosedInDateWindow: z.number().nullable(),
  leadTimeDays: leadTimeStatsSchema,
  cycleTimeDays: leadTimeStatsSchema,
  agingOpenDays: leadTimeStatsSchema,
  agingTop: z.array(agingItemSchema),
  wip: z.object({
    new: z.number(),
    active: z.number(),
    total: z.number(),
  }),
  stateDistributionPct: z.object({
    new: z.number(),
    active: z.number(),
    closed: z.number(),
  }),
  mixByType: z.array(mixRowSchema),
  topTags: z.array(tagCountSchema),
  blockedOrImpedimentLike: z.number(),
  overdueByArea: z.array(overdueByAreaSchema),
  leadTimeVariabilityRatio: z.number().nullable(),
  notes: z.array(z.string()),
});

/** Valida o corpo JSON do export PPTX (`report` obrigatório). */
export const reportResultSchema = z.object({
  filter: reportFilterSchema,
  wiql: z.string(),
  warnings: z.array(z.string()),
  roadmap: z.array(roadmapRowSchema),
  consolidated: consolidatedSchema,
  byArea: z.array(areaSummarySchema),
  analytics: analyticsSchema,
});
