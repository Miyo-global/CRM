import { z } from "zod";
import { BONUS_TYPE_VALUES } from "@/lib/validations/bonus";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => emailRe.test(s), { message: "Invalid email address" });
const recipientArray = z.array(emailField).max(100);

export const bonusExportFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(["ALL", "PENDING", "APPROVED", "PAID"]).optional().default("ALL"),
  type: z.enum(["ALL", ...BONUS_TYPE_VALUES]).optional().default("ALL"),
  userId: z.string().optional().default("ALL"),
  dateFrom: z.string().regex(dateRe).optional().or(z.literal("")),
  dateTo: z.string().regex(dateRe).optional().or(z.literal("")),
});

export const bonusExportEmailSchema = bonusExportFiltersSchema
  .extend({
    to: recipientArray.min(1, "Select at least one recipient"),
    cc: recipientArray.optional().default([]),
    bcc: recipientArray.optional().default([]),
    subject: z.string().max(200).optional(),
    message: z.string().max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "End date must be on or after start date",
      });
    }
  });
