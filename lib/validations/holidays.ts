import { z } from "zod";
import { dateOnlySchema } from "@/lib/validations/date";
import {
  collapseSpaces,
  hasMeaningfulContent,
  isSimpleName,
  SIMPLE_NAME_ALLOWED_HINT,
} from "@/lib/validations/text-rules";

const holidayNameSchema = z
  .string()
  .trim()
  .min(2, "Holiday name must be at least 2 characters")
  .max(100, "Holiday name must be at most 100 characters")
  .refine((v) => hasMeaningfulContent(v), "Holiday name must contain at least one letter or number")
  .refine((v) => isSimpleName(v), `Holiday name can only contain ${SIMPLE_NAME_ALLOWED_HINT}`)
  .transform(collapseSpaces);

const holidayDateSchema = dateOnlySchema;

export const HOLIDAY_MESSAGE_MAX = 500;

const optionalHolidayMessage = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(HOLIDAY_MESSAGE_MAX, `Message must be at most ${HOLIDAY_MESSAGE_MAX} characters`),
  ])
  .optional();

export const createHolidaySchema = z.object({
  name: holidayNameSchema,
  date: holidayDateSchema,
  type: z.enum(["NATIONAL", "PUBLIC", "OPTIONAL"]).default("PUBLIC"),
  message: optionalHolidayMessage,
  isPublic: z.boolean().optional().default(false),
  isHalfDay: z.boolean().optional().default(false),
});

export const updateHolidaySchema = z.object({
  name: holidayNameSchema.optional(),
  date: holidayDateSchema.optional(),
  type: z.enum(["NATIONAL", "PUBLIC", "OPTIONAL"]).optional(),
  message: optionalHolidayMessage,
  isPublic: z.boolean().optional(),
  isHalfDay: z.boolean().optional(),
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
