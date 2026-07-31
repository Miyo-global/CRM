import { z } from "zod";

export const appraisalTypeSchema = z.enum([
  "ANNUAL",
  "MID_YEAR",
  "QUARTERLY",
  "MONTHLY",
  "SEMI_ANNUAL",
  "PROBATION_COMPLETION",
  "CONFIRMATION",
  "ONBOARDING",
  "EXIT",
  "PROMOTION",
  "ROLE_CHANGE",
  "SALARY_REVISION",
  "PROJECT_COMPLETION",
  "CRITICAL_INCIDENT",
  "GOAL_BASED",
  "TARGET_ACHIEVEMENT",
]);

export const createAppraisalSchema = z.object({
  userId: z.string().min(1),
  reviewerId: z.string().min(1).optional().nullable(),
  cycleId: z.number().int().positive().optional(),
  type: appraisalTypeSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confidentialityNote: z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  if (data.periodEnd < data.periodStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Period end must be on or after the period start",
      path: ["periodEnd"],
    });
  }
  const inRange = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    const year = parsed.getUTCFullYear();
    return year >= 2000 && year <= 2100;
  };
  if (!inRange(data.periodStart)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Period start is not a valid date",
      path: ["periodStart"],
    });
  }
  if (!inRange(data.periodEnd)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Period end is not a valid date",
      path: ["periodEnd"],
    });
  }
});

export const patchAppraisalRatingsSchema = z.object({
  ratings: z
    .array(
      z.object({
        categoryId: z.number().int().positive(),
        selfScore: z.number().min(1).max(5).optional().nullable(),
        selfText: z.string().max(5000).optional().nullable(),
        managerScore: z.number().min(1).max(5).optional().nullable(),
        managerComment: z.string().max(5000).optional().nullable(),
      })
    )
    .min(1),
});

export const completeStageSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const patchAppraisalMetaSchema = z.object({
  outcomeNotes: z.string().max(8000).optional(),
  confidentialityNote: z.string().max(2000).optional(),
  calibratedRating: z.number().min(1).max(5).optional().nullable(),
  hrCalibrationNotes: z.string().max(4000).optional().nullable(),
  proposedSalary: z.number().positive().optional().nullable(),
  salaryIncrementPct: z.number().min(0).max(100).optional().nullable(),
  promotionRecommended: z.boolean().optional(),
  proposedDesignation: z.string().max(200).optional().nullable(),
  appraisalLetterUrl: z.string().url().optional().nullable(),
  discussionScheduledAt: z.string().datetime().optional().nullable(),
  discussionNotes: z.string().max(4000).optional().nullable(),
});
