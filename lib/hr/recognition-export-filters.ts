import { z } from "zod";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export const recognitionExportFiltersSchema = z.object({
  searchQuery: z.string().max(200).optional(),
  category: z
    .enum(["ALL", "KUDOS", "TEAMWORK", "INNOVATION", "LEADERSHIP", "ABOVE_AND_BEYOND"])
    .optional()
    .default("ALL"),
  department: z.string().max(200).optional().default("ALL"),
  fromUserId: z.string().optional().default("ALL"),
  toUserId: z.string().optional().default("ALL"),
  dateFrom: z.string().regex(dateRe).optional().or(z.literal("")),
  dateTo: z.string().regex(dateRe).optional().or(z.literal("")),
  historyFilter: z.enum(["ALL", "SENT", "RECEIVED"]).optional().default("ALL"),
});

export type RecognitionExportFilters = z.infer<typeof recognitionExportFiltersSchema>;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => emailRe.test(s), { message: "Invalid email address" });
const recipientArray = z.array(emailField).max(100);

export const recognitionExportEmailSchema = recognitionExportFiltersSchema
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
    const seen = new Map<string, "To" | "CC" | "BCC">();
    const fields: [string[], "To" | "CC" | "BCC"][] = [
      [data.to, "To"],
      [data.cc, "CC"],
      [data.bcc, "BCC"],
    ];
    for (const [list, field] of fields) {
      for (const email of list) {
        const prev = seen.get(email);
        if (prev) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field === prev ? field.toLowerCase() : "to"],
            message: `"${email}" is listed in more than one recipient field.`,
          });
          return;
        }
        seen.set(email, field);
      }
    }
  });

export type RecognitionExportEmailInput = z.infer<typeof recognitionExportEmailSchema>;

const CATEGORY_LABELS: Record<string, string> = {
  KUDOS: "Kudos",
  TEAMWORK: "Teamwork",
  INNOVATION: "Innovation",
  LEADERSHIP: "Leadership",
  ABOVE_AND_BEYOND: "Above & Beyond",
};

export function buildRecognitionScopeLabel(filters: RecognitionExportFilters): string {
  const parts: string[] = [];
  if (filters.category && filters.category !== "ALL") {
    parts.push(CATEGORY_LABELS[filters.category] ?? filters.category);
  }
  if (filters.department && filters.department !== "ALL") parts.push(filters.department);
  if (filters.historyFilter && filters.historyFilter !== "ALL") {
    parts.push(filters.historyFilter === "SENT" ? "Sent by me" : "Received by me");
  }
  if (filters.searchQuery?.trim()) parts.push(`search: "${filters.searchQuery.trim()}"`);
  return parts.length ? parts.join(" · ") : "All recognition records";
}

export function recognitionExportFilename(): string {
  return `recognition-history-${new Date().toISOString().slice(0, 10)}.csv`;
}
