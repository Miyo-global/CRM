import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const params = req.nextUrl.searchParams;
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const userId = params.get("userId");
    const isAdmin = isAdminOrOwner(session.user.role);

    const conditions = [eq(timesheets.orgId, session.orgId)];

    if (!isAdmin) {
      conditions.push(eq(timesheets.userId, session.user.id));
    } else if (userId) {
      conditions.push(eq(timesheets.userId, userId));
    }

    if (startDate) conditions.push(gte(timesheets.date, startDate));
    if (endDate) conditions.push(lte(timesheets.date, endDate));

    const data = await db
      .select({
        date: timesheets.date,
        hours: timesheets.hours,
        description: timesheets.description,
        status: timesheets.status,
        userName: users.name,
        userEmail: users.email,
      })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.userId, users.id))
      .where(and(...conditions))
      .orderBy(timesheets.date)
      .limit(10000);

    const headers = ["Date", "Employee", "Email", "Hours", "Description", "Status"];
    const rows = data.map((r) => [
      r.date,
      r.userName || "",
      r.userEmail || "",
      r.hours || "0",
      r.description || "",
      r.status || "PENDING",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((val) => {
            let s = String(val ?? "");
            if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    void createAuditLog({
      action: "worklog.exported",
      userId: session.user.id,
      orgId: session.orgId,
      metadata: { format: "csv", recordCount: rows.length, startDate, endDate },
    }).catch(() => {});

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="work-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  });
}
