import { type NextRequest, NextResponse } from "next/server";
import { withAuth, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  assigneeId: z.string().optional(),
});

function escapeCell(value: string | number | null | undefined): string {
  let str = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCell).join(",");
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, querySchema);

    const conditions = [eq(leads.orgId, session.orgId), isNull(leads.deletedAt)];

    if (filters.status) {
      conditions.push(eq(leads.status, filters.status));
    }
    if (filters.priority) {
      conditions.push(eq(leads.priority, filters.priority));
    }
    if (filters.assigneeId) {
      conditions.push(eq(leads.assignedToId, filters.assigneeId));
    }

    const rows = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        city: leads.city,
        status: leads.status,
        priority: leads.priority,
        score: leads.score,
        source: leads.source,
        potentialValue: leads.potentialValue,
        createdAt: leads.createdAt,
        assigneeName: users.name,
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedToId, users.id))
      .where(and(...conditions))
      .orderBy(leads.createdAt)
      .limit(50000);

    const header = toRow([
      "ID",
      "Name",
      "Email",
      "Phone",
      "Company",
      "City",
      "Stage",
      "Priority",
      "Score",
      "Source",
      "Potential Value",
      "Assigned To",
      "Created At",
    ]);

    const dataRows = rows.map((r) =>
      toRow([
        r.id,
        r.name,
        r.email,
        r.phone,
        r.company,
        r.city,
        r.status,
        r.priority,
        r.score,
        r.source,
        r.potentialValue,
        r.assigneeName,
        r.createdAt ? new Date(r.createdAt).toISOString() : "",
      ]),
    );

    const csvContent = [header, ...dataRows].join("\r\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leads-export.csv"',
      },
    });
  });
}
