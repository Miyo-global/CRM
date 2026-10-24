import { z } from "zod";

/** A reason is a short label picked from a list, not a sentence (QA-BUG-27). */
export const TERMINATION_REASON_LABEL_MAX = 120;

export const terminationReasonLabelSchema = z
  .string()
  .trim()
  .min(1, "Label is required")
  .max(TERMINATION_REASON_LABEL_MAX, `Label must be at most ${TERMINATION_REASON_LABEL_MAX} characters`);

export const terminationReasonFormSchema = z.object({
  label: terminationReasonLabelSchema,
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
});

export type TerminationReasonFormValues = z.infer<typeof terminationReasonFormSchema>;

/** Free-text caps on a termination (R3-LEN-01); the form shows n/max. */
export const TERMINATION_EXPLANATION_MAX = 5000;
export const TERMINATION_NOTES_MAX = 2000;
export const TERMINATION_REMARKS_MAX = 1000;
