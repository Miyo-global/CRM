import { z } from "zod";
import { dateOnlySchema } from "@/lib/validations/date";
import { collapseSpaces, hasMeaningfulContent } from "@/lib/validations/text-rules";

export const SHIFT_NAME_MAX = 80;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");

const shiftFields = {
  name: z
    .string()
    .trim()
    .min(2, "Shift name must be at least 2 characters")
    .max(SHIFT_NAME_MAX, `Shift name must be at most ${SHIFT_NAME_MAX} characters`)
    .refine((v) => hasMeaningfulContent(v), "Shift name must contain at least one letter or number")
    .transform(collapseSpaces),
  startTime: timeSchema,
  endTime: timeSchema,
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day")
    .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
};

export const createShiftSchema = z
  .object(shiftFields)
  .refine((v) => v.startTime !== v.endTime, { message: "Start and end time must differ", path: ["endTime"] });

export const updateShiftSchema = z.object({
  ...shiftFields,
  isActive: z.boolean(),
}).partial();

export const createShiftAssignmentSchema = z
  .object({
    userId: z.string().min(1, "Pick an employee"),
    shiftId: z.number().int().positive(),
    effectiveFrom: dateOnlySchema,
    effectiveTo: dateOnlySchema.nullable().optional(),
  })
  .refine((v) => !v.effectiveTo || v.effectiveTo >= v.effectiveFrom, {
    message: "End date must be on or after the start date",
    path: ["effectiveTo"],
  });
