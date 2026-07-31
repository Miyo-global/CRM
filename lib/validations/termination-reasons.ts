import { z } from "zod";

export const terminationReasonLabelSchema = z
  .string()
  .trim()
  .min(1, "Label is required")
  .max(200, "Label must be at most 200 characters");

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
