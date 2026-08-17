import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { quotes, quoteLineItems, users, deals, clientAccounts } from "@/lib/db/schema";
import { eq, and, desc, ilike, sql, count } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { ROLES } from "@/lib/constants/roles";
import { z } from "zod";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
type QuoteStatus = (typeof QUOTE_STATUSES)[number];

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).optional(),
});

const createSchema = z.object({
  dealId: z.number().optional(),
  clientId: z.number().optional(),
  subject: z.string().min(1),
  description: z.string().optional(),
  currency: z.string().optional(),
  validUntil: z.string(),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    const dealId = params.get("dealId") ? Number(params.get("dealId")) : undefined;
    const search = params.get("search") || undefined;
    const limit = Math.min(Number(params.get("limit")) || 25, 100);
    const offset = Number(params.get("offset")) || 0;

    const conditions = [eq(quotes.orgId, session.orgId)];
    if (status && (QUOTE_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(quotes.status, status as QuoteStatus));
    }
    if (dealId) conditions.push(eq(quotes.dealId, dealId));
    if (search) conditions.push(ilike(quotes.subject, `%${search}%`));

    const where = and(...conditions);

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: quotes.id,
          orgId: quotes.orgId,
          dealId: quotes.dealId,
          clientId: quotes.clientId,
          quoteNumber: quotes.quoteNumber,
          subject: quotes.subject,
          status: quotes.status,
          currency: quotes.currency,
          totalAmount: quotes.totalAmount,
          netAmount: quotes.netAmount,
          validUntil: quotes.validUntil,
          createdById: quotes.createdById,
          sentAt: quotes.sentAt,
          acceptedAt: quotes.acceptedAt,
          createdAt: quotes.createdAt,
          updatedAt: quotes.updatedAt,
          createdByName: users.name,
          createdByImage: users.image,
          dealName: deals.name,
          clientName: clientAccounts.clientName,
        })
        .from(quotes)
        .leftJoin(users, eq(quotes.createdById, users.id))
        .leftJoin(deals, eq(quotes.dealId, deals.id))
        .leftJoin(clientAccounts, eq(quotes.clientId, clientAccounts.id))
        .where(where)
        .orderBy(desc(quotes.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(quotes).where(where),
    ]);

    return ok({
      quotes: data.map((q) => ({
        ...q,
        createdBy: q.createdByName ? { id: q.createdById, name: q.createdByName, image: q.createdByImage } : null,
        deal: q.dealId ? { id: q.dealId, name: q.dealName } : null,
        client: q.clientId ? { id: q.clientId, clientName: q.clientName } : null,
      })),
      total: totalResult[0]?.count ?? 0,
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (role !== ROLES.CEO && role !== ROLES.ADMIN && role !== ROLES.HR && role !== ROLES.SALES) {
      return err("You do not have permission to create quotes", 403);
    }

    const input = await parseBody(req, createSchema);

    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replace(/-/g, "");

    let totalAmount = 0;
    let totalTax = 0;
    for (const item of input.lineItems) {
      const lineAmount = item.quantity * item.unitPrice;
      const lineTax = lineAmount * ((item.taxRate ?? 0) / 100);
      totalAmount += lineAmount;
      totalTax += lineTax;
    }
    const netAmount = totalAmount + totalTax;

    const quote = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${session.orgId} || 'quote'))`
      );

      const existingCount = await tx
        .select({ count: count() })
        .from(quotes)
        .where(and(eq(quotes.orgId, session.orgId), sql`DATE(${quotes.createdAt} AT TIME ZONE 'Asia/Kolkata') = DATE(now() AT TIME ZONE 'Asia/Kolkata')`));
      const seq = ((existingCount[0]?.count ?? 0) + 1).toString().padStart(3, "0");
      const quoteNumber = `QT-${dateStr}-${seq}`;

      const [created] = await tx.insert(quotes).values({
        orgId: session.orgId,
        dealId: input.dealId ?? null,
        clientId: input.clientId ?? null,
        quoteNumber,
        subject: input.subject,
        description: input.description ?? null,
        status: "DRAFT",
        currency: input.currency ?? "INR",
        totalAmount: totalAmount.toFixed(2),
        taxAmount: totalTax.toFixed(2),
        discountAmount: "0",
        netAmount: netAmount.toFixed(2),
        validUntil: input.validUntil,
        termsAndConditions: input.termsAndConditions ?? null,
        createdById: session.user.id,
        notes: input.notes ?? null,
      }).returning();

      await tx.insert(quoteLineItems).values(
        input.lineItems.map((item, idx) => ({
          quoteId: created.id,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          amount: (item.quantity * item.unitPrice).toFixed(2),
          taxRate: (item.taxRate ?? 0).toFixed(2),
          displayOrder: idx,
        }))
      );

      return created;
    });

    void createAuditLog({
      action: "quote.created",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(quote.id),
      targetType: "quote",
      metadata: { quoteNumber: quote.quoteNumber, subject: input.subject },
    }).catch(() => {});

    return ok(quote, 201);
  });
}
