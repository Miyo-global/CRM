import { z } from "zod";

/** MIYO-0633: what a job posting needs before it can be saved. */
export const WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"] as const;
export const JOB_MEMBER_ROLES = ["HIRING_MANAGER", "INTERVIEWER", "RECRUITER"] as const;

const optionalMoney = z
  .union([z.number(), z.string()])
  .transform((v) => (v === "" || v === null ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    message: "Enter a salary of zero or more.",
  })
  .optional();

export const jobBodySchema = z
  .object({
    title: z.string().trim().min(2, "Give the job a title.").max(120),
    requisitionId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    workMode: z.enum(WORK_MODES).default("ONSITE"),
    /** Free text so a job outside India still reads sensibly. */
    location: z.string().trim().max(120).optional(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
    openings: z.coerce.number().int().min(1).max(99).default(1),
    description: z.string().trim().min(20, "Describe the job.").max(20000),
    requirements: z.string().trim().max(20000).optional(),
    salaryMin: optionalMoney,
    salaryMax: optionalMoney,
    currency: z.string().trim().length(3).default("INR"),
    salaryVisible: z.boolean().default(false),
    /** ISO date; the careers site stops showing the job after it. */
    closesAt: z.string().trim().min(1).optional(),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(160).optional(),
    hiringTeam: z
      .array(
        z.object({
          userId: z.string().trim().min(1),
          role: z.enum(JOB_MEMBER_ROLES).default("INTERVIEWER"),
        }),
      )
      .max(50)
      .optional(),
  })
  .refine(
    (v) => v.salaryMin === undefined || v.salaryMax === undefined || v.salaryMax >= v.salaryMin,
    { message: "The top of the range cannot be below the bottom.", path: ["salaryMax"] },
  )
  .refine((v) => !v.closesAt || !Number.isNaN(Date.parse(v.closesAt)), {
    message: "Enter a valid closing date.",
    path: ["closesAt"],
  });

export type JobBody = z.infer<typeof jobBodySchema>;
