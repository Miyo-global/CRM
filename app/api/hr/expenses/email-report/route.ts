import { ok, err, withAdmin } from "@/lib/api/helpers";
import { emailExpenseReport, type ExportFilters } from "@/server/actions/expense-export";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const filtersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().optional(),
  categoryId: z.number().optional(),
  category: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  userId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  paymentMethod: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().optional(),
});

const bodySchema = z.object({
  filters: filtersSchema.default({}),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err("Invalid request body", 400);
    const { filters, to, cc, bcc, subject, message } = parsed.data;
    const result = await emailExpenseReport(filters as ExportFilters, {
      to,
      cc,
      bcc,
      subject,
      message,
    });
    if (!result.success) return err(result.error ?? "Failed to send email", 400);
    return ok({ success: true });
  });
}
