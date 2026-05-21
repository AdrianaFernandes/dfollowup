import { z } from "zod";

export const WORK_ITEM_TYPES = [
  "Epic",
  "Feature",
  "User Story",
  "Task",
  "Bug",
] as const;

export type WorkItemTypeName = (typeof WORK_ITEM_TYPES)[number];

export const reportFilterSchema = z
  .object({
    project: z.string().min(1, "Projeto obrigatório"),
    areaPaths: z.array(z.string().min(1)).min(1, "Selecione ao menos uma Area Path"),
    dateMode: z.enum(["iteration", "targetDate"]),
    iterationPaths: z.array(z.string().min(1)).optional(),
    targetDateStart: z.string().optional(),
    targetDateEnd: z.string().optional(),
    workItemTypes: z
      .array(z.enum(WORK_ITEM_TYPES))
      .min(1, "Selecione ao menos um tipo de work item"),
    /** Se definido e não vazio, a WIQL restringe a `[System.State] IN (...)`. Nomes exactos do processo. */
    states: z.array(z.string().min(1)).max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateMode === "iteration") {
      if (!data.iterationPaths?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione ao menos uma Iteration Path",
          path: ["iterationPaths"],
        });
      }
    } else {
      if (!data.targetDateStart?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data inicial obrigatória",
          path: ["targetDateStart"],
        });
      }
      if (!data.targetDateEnd?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data final obrigatória",
          path: ["targetDateEnd"],
        });
      }
    }
  });

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
