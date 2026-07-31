import { z } from "zod";

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const requestLeaveInputSchema = z.object({
  typeId: z.number().int().positive(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  reason: z.string().min(1, "Reason is required"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
}).refine((data) => {
  const start = new Date(data.startDate);
  const earliest = new Date();
  earliest.setHours(0, 0, 0, 0);
  earliest.setDate(earliest.getDate() - 365);
  return start >= earliest;
}, {
  message: "Start date is too far in the past",
  path: ["startDate"],
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
  return days <= 366;
}, {
  message: "Leave span cannot exceed 366 days",
  path: ["endDate"],
});
