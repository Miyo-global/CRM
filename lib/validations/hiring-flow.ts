import { z } from "zod";

export const HIRING_FLOW_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  descriptionMax: 500,
  roundNameMax: 100,
  minRounds: 1,
  maxRounds: 10,
  durationMin: 15,
  durationMax: 480,
  slaMin: 1,
  slaMax: 30,
} as const;

export const HIRING_FLOW_ROUND_TYPES = [
  "HR_SCREENING",
  "TECHNICAL",
  "MANAGER",
  "CULTURAL_FIT",
  "FINAL",
  "CUSTOM",
] as const;

export const HIRING_FLOW_ROUND_MODES = ["VIDEO", "PHONE", "ONSITE"] as const;

function requiredIntField(label: string, min: number, max: number) {
  return z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return NaN;
      return Number(val);
    },
    z
      .number()
      .finite(`${label} must be a valid number`)
      .int(`${label} must be a whole number`)
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`),
  );
}

export const hiringFlowRoundSchema = z.object({
  roundOrder: z.number().int().min(1),
  name: z
    .string()
    .trim()
    .min(1, "Round name is required")
    .max(
      HIRING_FLOW_LIMITS.roundNameMax,
      `Round name must be at most ${HIRING_FLOW_LIMITS.roundNameMax} characters`,
    ),
  type: z.enum(HIRING_FLOW_ROUND_TYPES, {
    error: "Select a valid round type",
  }),
  mode: z.enum(HIRING_FLOW_ROUND_MODES, {
    error: "Select a valid interview mode",
  }),
  slaDays: requiredIntField(
    "SLA (days)",
    HIRING_FLOW_LIMITS.slaMin,
    HIRING_FLOW_LIMITS.slaMax,
  ),
  durationMinutes: requiredIntField(
    "Duration (min)",
    HIRING_FLOW_LIMITS.durationMin,
    HIRING_FLOW_LIMITS.durationMax,
  ),
  interviewerRole: z.string().trim().max(100).optional(),
  questionBankTag: z.string().trim().max(100).optional(),
  autoAdvanceThreshold: z.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const hiringFlowFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(HIRING_FLOW_LIMITS.nameMin, `Name must be at least ${HIRING_FLOW_LIMITS.nameMin} characters`)
      .max(
        HIRING_FLOW_LIMITS.nameMax,
        `Name must be at most ${HIRING_FLOW_LIMITS.nameMax} characters`,
      ),
    description: z
      .string()
      .trim()
      .max(
        HIRING_FLOW_LIMITS.descriptionMax,
        `Description must be at most ${HIRING_FLOW_LIMITS.descriptionMax} characters`,
      )
      .optional()
      .or(z.literal("")),
    isDefault: z.boolean(),
    rounds: z
      .array(hiringFlowRoundSchema)
      .min(
        HIRING_FLOW_LIMITS.minRounds,
        "Add at least one interview round",
      )
      .max(
        HIRING_FLOW_LIMITS.maxRounds,
        `A hiring flow can have at most ${HIRING_FLOW_LIMITS.maxRounds} rounds`,
      ),
  })
  .superRefine((data, ctx) => {
    const seen = new Map<string, number>();
    for (let i = 0; i < data.rounds.length; i++) {
      const key = data.rounds[i].name.trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rounds", i, "name"],
          message: "Round names must be unique within this flow",
        });
        const firstIdx = seen.get(key)!;
        if (firstIdx !== i) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rounds", firstIdx, "name"],
            message: "Round names must be unique within this flow",
          });
        }
      } else {
        seen.set(key, i);
      }
    }
  });

export type HiringFlowFormValues = z.infer<typeof hiringFlowFormSchema>;

export type HiringFlowFormErrors = {
  name?: string;
  description?: string;
  rounds?: string;
  roundByIndex?: Record<number, Partial<Record<"name" | "durationMinutes" | "slaDays" | "type" | "mode", string>>>;
};

export function mapHiringFlowFormErrors(
  issues: z.ZodIssue[],
): HiringFlowFormErrors {
  const errors: HiringFlowFormErrors = { roundByIndex: {} };

  for (const issue of issues) {
    const [root, index, field] = issue.path;
    if (root === "rounds" && typeof index === "number") {
      errors.roundByIndex![index] = {
        ...errors.roundByIndex![index],
        [String(field)]: issue.message,
      };
      continue;
    }
    if (root === "rounds" && field === undefined) {
      errors.rounds = issue.message;
      continue;
    }
    if (root === "name") errors.name = issue.message;
    if (root === "description") errors.description = issue.message;
  }

  return errors;
}
