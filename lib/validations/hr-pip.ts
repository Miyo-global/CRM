import { z } from "zod";

export const PIP_PHASES = [
  "IDENTIFY",
  "INITIAL_FEEDBACK",
  "FORMAL_PIP",
  "MONITORING",
  "EVALUATION",
  "CLOSED",
] as const;
export type PipPhase = (typeof PIP_PHASES)[number];

export const PIP_PHASE_LABELS: Record<PipPhase, string> = {
  IDENTIFY: "Identify & Assess",
  INITIAL_FEEDBACK: "Initial Feedback",
  FORMAL_PIP: "PIP Initiation",
  MONITORING: "Monitor & Support",
  EVALUATION: "Evaluation & Outcome",
  CLOSED: "Closed",
};

export const PIP_MANAGEMENT_DECISIONS = [
  "REDEPLOYMENT",
  "TRANSFER",
  "DEMOTION",
  "TERMINATION",
] as const;
export type PipManagementDecision = (typeof PIP_MANAGEMENT_DECISIONS)[number];

export const PIP_MANAGEMENT_DECISION_LABELS: Record<PipManagementDecision, string> = {
  REDEPLOYMENT: "Redeployment",
  TRANSFER: "Transfer",
  DEMOTION: "Demotion",
  TERMINATION: "Termination",
};

export const MONITORING_PERIOD_DAYS = [30, 60, 90] as const;
export type MonitoringPeriodDays = (typeof MONITORING_PERIOD_DAYS)[number];

export const PIP_DOC_TYPES = [
  "OBSERVATION_NOTES",
  "COUNSELING_RECORD",
  "PIP_PLAN",
  "REVIEW_NOTES",
  "EVALUATION_SUMMARY",
  "DECISION_RECORD",
] as const;
export type PipDocType = (typeof PIP_DOC_TYPES)[number];

export const PIP_DOC_TYPE_LABELS: Record<PipDocType, string> = {
  OBSERVATION_NOTES: "Performance Observation Notes",
  COUNSELING_RECORD: "Counseling Record",
  PIP_PLAN: "PIP Plan Document",
  REVIEW_NOTES: "PIP Review Notes",
  EVALUATION_SUMMARY: "Evaluation Summary",
  DECISION_RECORD: "Decision Record",
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const pipReasonCategorySchema = z.enum([
  "POOR_PERFORMANCE",
  "BEHAVIORAL",
  "POLICY_VIOLATION",
  "MISSED_KPIS",
]);

export const pipReviewFrequencySchema = z.enum(["WEEKLY", "BI_WEEKLY", "MONTHLY"]);

export const pipReasonEntrySchema = z.object({
  category: pipReasonCategorySchema,
  description: z
    .string()
    .trim()
    .min(10, "Reason description must be at least 10 characters")
    .max(2000, "Reason description cannot exceed 2000 characters"),
});

export const pipReasonsSchema = z
  .array(pipReasonEntrySchema)
  .min(1, "At least one reason is required")
  .max(5, "Maximum 5 reasons allowed");

const pipGoalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Goal title must be at least 3 characters")
    .max(120, "Goal title cannot exceed 120 characters"),
  description: z.string().trim().max(2000, "Goal description cannot exceed 2000 characters").optional(),
  successCriteria: z
    .string()
    .trim()
    .min(5, "Success criteria must be at least 5 characters")
    .max(2000, "Success criteria cannot exceed 2000 characters"),
  deadline: z.string().regex(DATE_REGEX, "Goal deadline must be in YYYY-MM-DD format"),
});

export const createPIPSchema = z
  .object({
    userId: z.string().min(1, "Employee is required"),
    reasons: pipReasonsSchema,
    areasOfConcern: z
      .array(z.string().trim().min(1).max(200))
      .min(1, "At least one area of concern is required")
      .max(50, "Maximum 50 areas allowed"),
    evidence: z
      .string()
      .trim()
      .min(5, "Evidence must be at least 5 characters")
      .max(8000, "Evidence cannot exceed 8000 characters"),
    goals: z
      .array(pipGoalSchema)
      .min(1, "At least one improvement goal is required")
      .max(10, "Maximum 10 goals allowed"),
    startDate: z.string().regex(DATE_REGEX, "Start date must be in YYYY-MM-DD format"),
    endDate: z.string().regex(DATE_REGEX, "End date must be in YYYY-MM-DD format"),
    reviewFrequency: pipReviewFrequencySchema,
    reviewMethod: z
      .string()
      .trim()
      .min(2, "Review method must be at least 2 characters")
      .max(200, "Review method cannot exceed 200 characters"),
    mentorId: z.string().nullable().optional(),
    hrRepId: z.string().min(1, "HR representative is required"),
    expectedImprovement: z
      .string()
      .trim()
      .min(3, "Expected improvement must be at least 3 characters")
      .max(2000, "Expected improvement cannot exceed 2000 characters"),
    consequencesIfNotMet: z
      .string()
      .trim()
      .min(3, "Consequences must be at least 3 characters")
      .max(2000, "Consequences cannot exceed 2000 characters"),
    monitoringPeriodDays: z
      .union([z.literal(30), z.literal(60), z.literal(90)])
      .optional(),
    linkedAppraisalId: z.number().int().positive().nullable().optional(),
    counselingNotes: z.string().trim().max(8000, "Counseling notes cannot exceed 8000 characters").optional(),
    counselingDate: z.string().regex(DATE_REGEX).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after the start date",
        path: ["endDate"],
      });
    }

    if (data.startDate && data.endDate) {
      const diffDays =
        (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
        86400000;
      if (diffDays < 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PIP period must be at least 7 days",
          path: ["endDate"],
        });
      }
    }

    data.goals.forEach((goal, i) => {
      if (goal.deadline < data.startDate || goal.deadline > data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Goal deadline must fall within the PIP period",
          path: ["goals", i, "deadline"],
        });
      }
    });

    if (data.userId === data.hrRepId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HR representative must be different from the employee",
        path: ["hrRepId"],
      });
    }

    if (data.mentorId && data.mentorId === data.userId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mentor must be different from the employee",
        path: ["mentorId"],
      });
    }

    if (data.counselingDate && data.counselingDate > data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Counseling date must be on or before the PIP start date",
        path: ["counselingDate"],
      });
    }
  });

export const acknowledgePIPSchema = z.object({
  comment: z.string().trim().max(2000, "Comment cannot exceed 2000 characters").optional(),
  acknowledged: z.literal(true),
});

export const patchPIPSchema = z
  .object({
    status: z.enum(["DRAFT", "ACTIVE", "EXTENDED", "COMPLETED", "TERMINATED"]).optional(),
    outcome: z.string().trim().max(4000, "Outcome notes cannot exceed 4000 characters").optional(),
    notes: z.string().trim().max(4000, "Notes cannot exceed 4000 characters").optional(),
    startDate: z.string().regex(DATE_REGEX, "Start date must be in YYYY-MM-DD format").optional(),
    endDate: z.string().regex(DATE_REGEX, "End date must be in YYYY-MM-DD format").optional(),
    finalOutcome: z.enum(["SUCCESS", "EXTENDED", "FAILED"]).optional(),
    managementDecision: z.enum(["REDEPLOYMENT", "TRANSFER", "DEMOTION", "TERMINATION"]).optional(),
    reasons: pipReasonsSchema.optional(),
    evidence: z
      .string()
      .trim()
      .min(1)
      .max(8000, "Evidence cannot exceed 8000 characters")
      .optional(),
    areasOfConcern: z.array(z.string().trim().min(1).max(200)).min(1).max(50).optional(),
    reviewFrequency: pipReviewFrequencySchema.optional(),
    reviewMethod: z.string().trim().min(1).max(200).optional(),
    expectedImprovement: z.string().trim().min(1).max(2000).optional(),
    consequencesIfNotMet: z.string().trim().min(1).max(2000).optional(),
    monitoringPeriodDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional(),
    counselingNotes: z.string().trim().max(8000).optional(),
    counselingDate: z.string().regex(DATE_REGEX).nullable().optional(),
    sufficientEvidence: z.boolean().optional(),
    performanceImprovedCounseling: z.boolean().optional(),
    midpointAssessmentNotes: z.string().trim().max(8000).optional(),
    midpointOnTrack: z.boolean().optional(),
    phase: z
      .enum(["IDENTIFY", "INITIAL_FEEDBACK", "FORMAL_PIP", "MONITORING", "EVALUATION", "CLOSED"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after the start date",
        path: ["endDate"],
      });
    }
    if (data.finalOutcome === "FAILED" && !data.managementDecision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Management decision is required when outcome is Not Met",
        path: ["managementDecision"],
      });
    }
  });

export const createPIPDocumentSchema = z.object({
  docType: z.enum([
    "OBSERVATION_NOTES",
    "COUNSELING_RECORD",
    "PIP_PLAN",
    "REVIEW_NOTES",
    "EVALUATION_SUMMARY",
    "DECISION_RECORD",
  ]),
  title: z
    .string()
    .trim()
    .min(3, "Document title must be at least 3 characters")
    .max(200, "Document title cannot exceed 200 characters"),
  content: z
    .string()
    .trim()
    .min(1, "Document content is required")
    .max(50000, "Document content cannot exceed 50000 characters"),
});

export const pipCheckInGoalProgressSchema = z.object({
  pipGoalId: z.number().int().positive(),
  progressStatus: z.enum(["ON_TRACK", "AT_RISK", "NOT_MEETING"]),
  percentComplete: z.number().int().min(0).max(100),
  workDone: z
    .string()
    .trim()
    .min(1, "Work done is required")
    .max(8000, "Work done cannot exceed 8000 characters"),
  blockers: z
    .string()
    .trim()
    .min(1, "Blockers field is required (use 'None' if no blockers)")
    .max(8000, "Blockers cannot exceed 8000 characters"),
  nextSteps: z
    .string()
    .trim()
    .min(1, "Next steps are required")
    .max(8000, "Next steps cannot exceed 8000 characters"),
});

export const createPIPCheckInSchema = z
  .object({
    checkInDate: z.string().regex(DATE_REGEX, "Check-in date must be in YYYY-MM-DD format"),
    checkInType: pipReviewFrequencySchema,
    periodStart: z.string().regex(DATE_REGEX).nullable().optional(),
    periodEnd: z.string().regex(DATE_REGEX).nullable().optional(),
    overallStatus: z.enum(["ON_TRACK", "AT_RISK", "NOT_MEETING"]),
    summaryCommentsManager: z
      .string()
      .trim()
      .min(1, "Manager summary is required")
      .max(8000, "Manager summary cannot exceed 8000 characters"),
    summaryCommentsEmployee: z.string().trim().max(8000).nullable().optional(),
    managerRating: z.number().int().min(1).max(5).nullable().optional(),
    managerFeedback: z
      .string()
      .trim()
      .min(1, "Manager feedback is required")
      .max(8000, "Manager feedback cannot exceed 8000 characters"),
    improvementSinceLast: z.enum(["IMPROVED", "NO_CHANGE", "DECLINED"]),
    employeeSelfComments: z
      .string()
      .trim()
      .min(1, "Employee self-comments are required")
      .max(8000, "Employee self-comments cannot exceed 8000 characters"),
    supportRequired: z.string().trim().max(2000).nullable().optional(),
    riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
    escalationRequired: z.boolean().optional(),
    escalationNotes: z.string().trim().max(4000).nullable().optional(),
    goalProgress: z
      .array(pipCheckInGoalProgressSchema)
      .min(1, "Goal progress is required for check-ins"),
  })
  .superRefine((data, ctx) => {
    if (data.periodStart && data.periodEnd && data.periodEnd < data.periodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period end must be on or after period start",
        path: ["periodEnd"],
      });
    }
    if (data.escalationRequired && !data.escalationNotes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escalation notes are required when escalation is flagged",
        path: ["escalationNotes"],
      });
    }
  });
