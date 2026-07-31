import { z } from "zod";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => emailRe.test(s), { message: "Invalid email address" });
const recipientArray = z.array(emailField).max(100);

export const assetsExportEmailSchema = z
  .object({
    format: z.enum(["csv", "xlsx"]),
    status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]).optional(),
    to: recipientArray.min(1, "Select at least one recipient"),
    cc: recipientArray.optional().default([]),
    bcc: recipientArray.optional().default([]),
    subject: z.string().max(200).optional(),
    message: z.string().max(5000).optional(),
  })
  .superRefine((data, ctx) => {
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

export type AssetsExportEmailInput = z.infer<typeof assetsExportEmailSchema>;

export function assetsStatusLabel(status?: string): string {
  if (status === "AVAILABLE") return "Available";
  if (status === "ASSIGNED") return "Assigned";
  if (status === "MAINTENANCE") return "Maintenance";
  if (status === "RETIRED") return "Retired";
  return "All statuses";
}
