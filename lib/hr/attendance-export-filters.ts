import { z } from "zod";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const baseAttendanceExportSchema = z.object({
  userIds: z.array(z.string().min(1)).optional(),
  departmentIds: z.array(z.coerce.number().int().positive()).optional(),
  startDate: z.string().regex(dateRe, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(dateRe, "endDate must be YYYY-MM-DD"),
});

const rangeRefinement = (f: { startDate: string; endDate: string }) => f.startDate <= f.endDate;
const rangeError = { message: "Start date must be on or before end date", path: ["endDate"] };

export const attendanceExportFiltersSchema = baseAttendanceExportSchema.refine(rangeRefinement, rangeError);

export type AttendanceExportFilters = z.infer<typeof attendanceExportFiltersSchema>;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => emailRe.test(s), { message: "Invalid email address" });
const recipientArray = z.array(emailField).max(100);

export const attendanceExportEmailSchema = baseAttendanceExportSchema
  .extend({
    to: recipientArray.min(1, "Select at least one recipient"),
    cc: recipientArray.optional().default([]),
    bcc: recipientArray.optional().default([]),
    subject: z.string().max(200).optional(),
    message: z.string().max(5000).optional(),
  })
  .refine(rangeRefinement, rangeError)
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
            message: `"${email}" is listed in more than one recipient field (${prev}${
              prev === field ? "" : ` and ${field}`
            }).`,
          });
          return;
        }
        seen.set(email, field);
      }
    }
  });

export type AttendanceExportEmailInput = z.infer<typeof attendanceExportEmailSchema>;

export function attendanceRangeLabel(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} → ${endDate}`;
}

export function attendanceExportFilename(startDate: string, endDate: string): string {
  return `attendance-${startDate}_to_${endDate}.xlsx`;
}

export function buildAttendanceScopeLabel(
  filters: { userIds?: string[]; departmentIds?: number[] },
  rows: { employeeName: string; departmentName: string | null }[],
): string {
  const parts: string[] = [];

  if (filters.userIds?.length === 1) {
    parts.push(rows[0]?.employeeName ?? "1 employee");
  } else if (filters.userIds?.length) {
    parts.push(`${filters.userIds.length} employees`);
  }

  if (filters.departmentIds?.length === 1) {
    parts.push(rows[0]?.departmentName ?? "1 department");
  } else if (filters.departmentIds?.length) {
    parts.push(`${filters.departmentIds.length} departments`);
  }

  return parts.length ? parts.join(", ") : "All employees";
}
