import { z } from "zod";

export const projectCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Use at least 2 characters").max(200, "Keep the name under 200 characters"),
    key: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Use 2 to 10 letters or digits, starting with a letter"),
    description: z.string().max(5000).optional(),
    priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    managerId: z.string().optional(),
    memberIds: z.array(z.string()),
    templateId: z.string(),
    modules: z.object({
      sprints: z.boolean(),
      epics: z.boolean(),
      timeTracking: z.boolean(),
      wiki: z.boolean(),
    }),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "The due date must be on or after the start date",
    path: ["endDate"],
  });

export type ProjectCreateValues = z.infer<typeof projectCreateSchema>;

export const STEP_FIELDS: (keyof ProjectCreateValues)[][] = [
  ["name", "key", "description", "priority", "startDate", "endDate"],
  ["managerId", "memberIds"],
  ["templateId", "modules"],
];
