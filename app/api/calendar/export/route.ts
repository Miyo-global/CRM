import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { format } from "date-fns";

const querySchema = z.object({
  from: z.string(),
  to: z.string(),
});

function csvEscape(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes('"') || safe.includes(",") || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function formatDatetime(date: Date): string {
  return format(date, "yyyy-MM-dd HH:mm");
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    let params: z.infer<typeof querySchema>;
    try {
      params = parseQuery(req, querySchema);
    } catch {
      return err("Invalid query params: from and to are required (YYYY-MM-DD)", 400);
    }

    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return err("Invalid date format: use YYYY-MM-DD", 400);
    }

    if (fromDate.getTime() > toDate.getTime()) {
      return err("Invalid date range: 'from' must be on or before 'to'", 400);
    }

    const maxSpanMs = 366 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > maxSpanMs) {
      return err("Date range too large: maximum span is 1 year", 400);
    }

    const events = await db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.orgId, session.orgId),
        lte(calendarEvents.startDate, toDate),
        gte(calendarEvents.endDate, fromDate)
      ),
      orderBy: (t, { asc }) => [asc(t.startDate)],
    });

    const headers = ["Title", "Start", "End", "All Day", "Category", "Location", "Description", "Color"];
    const rows = events.map((event) => [
      csvEscape(event.title),
      csvEscape(formatDatetime(event.startDate)),
      csvEscape(formatDatetime(event.endDate)),
      event.allDay ? "Yes" : "No",
      csvEscape(event.category ?? ""),
      csvEscape(event.location ?? ""),
      csvEscape(event.description ?? ""),
      csvEscape(event.color ?? ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const filename = `calendar-${format(fromDate, "yyyy-MM-dd")}-to-${format(toDate, "yyyy-MM-dd")}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    }) as NextResponse<never>;
  });
}
