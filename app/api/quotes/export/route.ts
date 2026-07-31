import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { quotes, users, deals, clientAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";

const EXPORT_ROLES = new Set(["CEO", "HR", "SALES", "BRANCH_MANAGER", "BRANCH_HR", "ADMIN"]);

function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!role || !EXPORT_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;

    const conditions = [eq(quotes.orgId, session.orgId)];
    if (status) conditions.push(eq(quotes.status, status as "DRAFT"));

    const data = await db
      .select({
        quoteNumber: quotes.quoteNumber,
        subject: quotes.subject,
        status: quotes.status,
        currency: quotes.currency,
        totalAmount: quotes.totalAmount,
        taxAmount: quotes.taxAmount,
        netAmount: quotes.netAmount,
        validUntil: quotes.validUntil,
        createdBy: users.name,
        dealName: deals.name,
        clientName: clientAccounts.clientName,
        createdAt: quotes.createdAt,
        sentAt: quotes.sentAt,
        acceptedAt: quotes.acceptedAt,
      })
      .from(quotes)
      .leftJoin(users, eq(quotes.createdById, users.id))
      .leftJoin(deals, eq(quotes.dealId, deals.id))
      .leftJoin(clientAccounts, eq(quotes.clientId, clientAccounts.id))
      .where(and(...conditions))
      .limit(10000);

    const headers = ["Quote #", "Subject", "Status", "Currency", "Total", "Tax", "Net", "Valid Until", "Deal", "Client", "Created By", "Created At", "Sent At", "Accepted At"];
    const rows = data.map((q) => [
      q.quoteNumber,
      q.subject,
      q.status,
      q.currency,
      q.totalAmount,
      q.taxAmount,
      q.netAmount,
      q.validUntil,
      q.dealName || "",
      q.clientName || "",
      q.createdBy || "",
      q.createdAt ? new Date(q.createdAt).toISOString() : "",
      q.sentAt ? new Date(q.sentAt).toISOString() : "",
      q.acceptedAt ? new Date(q.acceptedAt).toISOString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((val) => `"${sanitizeCsvCell(String(val ?? "")).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    void createAuditLog({
      action: "quote.exported",
      userId: session.user.id,
      orgId: session.orgId,
      metadata: { format: "csv", recordCount: rows.length },
    }).catch(() => {});

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="quotes-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  });
}
