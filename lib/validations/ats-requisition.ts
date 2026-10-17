import { z } from "zod";

/** MIYO-0632: what a hiring request has to say before anyone can approve it. */
export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
] as const;

const money = z
  .union([z.number(), z.string()])
  .transform((v) => (v === "" || v === null ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    message: "Enter a salary of zero or more.",
  })
  .optional();

export const requisitionBodySchema = z
  .object({
    title: z.string().trim().min(2, "Give the role a title.").max(120),
    departmentId: z.coerce.number().int().positive().optional(),
    location: z.string().trim().max(120).optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).default("FULL_TIME"),
    openings: z.coerce.number().int().min(1, "At least one opening.").max(99),
    salaryMin: money,
    salaryMax: money,
    currency: z.string().trim().length(3).default("INR"),
    justification: z.string().trim().max(2000).optional(),
    hiringManagerId: z.string().trim().min(1).optional(),
    approverId: z.string().trim().min(1).optional(),
  })
  .refine(
    (v) => v.salaryMin === undefined || v.salaryMax === undefined || v.salaryMax >= v.salaryMin,
    { message: "The top of the range cannot be below the bottom.", path: ["salaryMax"] },
  );

export type RequisitionBody = z.infer<typeof requisitionBodySchema>;

export const requisitionDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(1000).optional(),
});
