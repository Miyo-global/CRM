import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getInvoices } from "@/server/queries/invoice";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { dateOnlyOptionalSchema } from "@/lib/validations/date";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1).max(999999),
  rate: z.number().positive().max(999999999.99),
  amount: z.number().min(0).max(999999999.99),
});

const createSchema = z.object({
  clientId: z.number().optional(),
  projectId: z.number().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  currency: z.string().default("INR"),
  dueDate: dateOnlyOptionalSchema,
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") as
        | "DRAFT"
        | "SENT"
        | "PAID"
        | "OVERDUE"
        | "CANCELLED"
        | null;
      const clientId = toNumber(params.get("clientId"));
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 50;

      const data = await getInvoices(session.orgId, {
        status: status ?? undefined,
        clientId,
        page,
        limit,
      });
      return ok(data);
    } catch {
      return err("Failed to load invoices", 500);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (role !== ROLES.CEO && role !== ROLES.ADMIN && role !== ROLES.HR && role !== ROLES.SALES) {
        return err("You do not have permission to create invoices", 403);
      }

      const body = await req.json();
      const input = createSchema.parse(body);

      const orgId = session.orgId;
      const lineItems = input.lineItems.map((item) => ({
        ...item,
        amount: Number((item.quantity * item.rate).toFixed(2)),
      }));
      const subtotal = Number(
        lineItems
          .reduce((sum, item) => sum + item.amount, 0)
          .toFixed(2)
      );
      const taxAmount = Number(
        (subtotal * (input.taxRate / 100)).toFixed(2)
      );
      if (input.discount > subtotal + taxAmount) {
        return err("Discount cannot exceed the invoice subtotal plus tax", 400);
      }
      const total = Number(
        Math.max(0, subtotal + taxAmount - input.discount).toFixed(2)
      );

      const year = Number(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: DEFAULT_TIMEZONE,
          year: "numeric",
        }).format(new Date())
      );

      const [invoice] = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || 'invoice'))`
        );

        const prefix = `INV-${year}-`;
        const [maxResult] = await tx
          .select({
            maxSeq: sql<number>`COALESCE(MAX(NULLIF(regexp_replace(${invoices.invoiceNumber}, '^.*-', ''), '')::int), 0)`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.orgId, orgId),
              sql`${invoices.invoiceNumber} LIKE ${prefix + "%"}`
            )
          );
        const nextNum = (maxResult?.maxSeq ?? 0) + 1;
        const invoiceNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

        return tx
          .insert(invoices)
          .values({
            orgId,
            clientId: input.clientId,
            projectId: input.projectId,
            invoiceNumber,
            lineItems,
            subtotal: subtotal.toString(),
            taxRate: input.taxRate.toString(),
            taxAmount: taxAmount.toString(),
            discount: input.discount.toString(),
            total: total.toString(),
            currency: input.currency,
            dueDate: input.dueDate,
            notes: input.notes,
            createdBy: session.user.id,
          })
          .returning();
      });

      void notifyByRoles(orgId, [ROLES.CEO, ROLES.HR], {
        type: "INFO",
        title: "Invoice Created",
        message: `Invoice ${invoice.invoiceNumber} for ${input.currency} ${total.toLocaleString()} was created.`,
        link: "/sales/invoices",
        metadata: { invoiceId: invoice.id },
        excludeUserId: session.user.id,
      }).catch(() => {});

      return ok(invoice, 201);
    } catch (error) {
      if (error instanceof z.ZodError) throw error;
      return err("Failed to create invoice", 500);
    }
  });
}
