import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { landingPages, pageViews } from "@/lib/db/schema/marketing";
import { leads } from "@/lib/db/schema/crm";
import { eq, and, gte, sql, count, isNotNull } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { subDays, format, startOfDay } from "date-fns";

type Params = { params: Promise<{ pageId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { pageId } = await params;
    const pid = Number(pageId);
    if (!Number.isFinite(pid) || pid <= 0) return err("Invalid page ID.", 400);

    const [page] = await db
      .select({ id: landingPages.id, slug: landingPages.slug, title: landingPages.title })
      .from(landingPages)
      .where(and(eq(landingPages.id, pid), eq(landingPages.orgId, session.orgId)));

    if (!page) return err("Landing page not found.", 404);

    const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
    const since = subDays(new Date(), Math.min(days, 365));

    const [totalViewsResult, totalLeadsResult, dailyViews, deviceBreakdownRows, utmSourceRows] =
      await Promise.all([
        db
          .select({ total: count() })
          .from(pageViews)
          .where(and(eq(pageViews.pageId, pid), gte(pageViews.viewedAt, since))),

        db
          .select({ total: count() })
          .from(leads)
          .where(
            and(
              eq(leads.orgId, session.orgId),
              gte(leads.createdAt, since),
              sql`${leads.referrerUrl} LIKE ${"%" + (page.slug ?? "") + "%"}`
            )
          ),

        db
          .select({
            date: sql<string>`date_trunc('day', ${pageViews.viewedAt})::date`,
            views: count(),
          })
          .from(pageViews)
          .where(and(eq(pageViews.pageId, pid), gte(pageViews.viewedAt, since)))
          .groupBy(sql`date_trunc('day', ${pageViews.viewedAt})::date`)
          .orderBy(sql`date_trunc('day', ${pageViews.viewedAt})::date`),

        db
          .select({
            deviceType: pageViews.deviceType,
            total: count(),
          })
          .from(pageViews)
          .where(and(eq(pageViews.pageId, pid), gte(pageViews.viewedAt, since)))
          .groupBy(pageViews.deviceType),

        db
          .select({
            utmSource: leads.utmSource,
            total: count(),
          })
          .from(leads)
          .where(
            and(
              eq(leads.orgId, session.orgId),
              gte(leads.createdAt, since),
              isNotNull(leads.utmSource),
              sql`${leads.referrerUrl} LIKE ${"%" + (page.slug ?? "") + "%"}`
            )
          )
          .groupBy(leads.utmSource)
          .orderBy(sql`count(*) DESC`),
      ]);

    const totalViews = totalViewsResult[0]?.total ?? 0;
    const totalLeads = totalLeadsResult[0]?.total ?? 0;
    const conversionRate =
      totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : "0.0";

    return ok({
      pageId: pid,
      title: page.title,
      slug: page.slug,
      period: { days, since: format(since, "yyyy-MM-dd") },
      summary: {
        totalViews,
        totalLeads,
        conversionRate: parseFloat(conversionRate),
      },
      dailyViews: dailyViews.map((d) => ({
        date: format(startOfDay(new Date(d.date)), "MMM d"),
        views: d.views,
      })),
      deviceBreakdown: deviceBreakdownRows.map((d) => ({
        type: d.deviceType ?? "unknown",
        count: d.total,
      })),
      utmSourceBreakdown: utmSourceRows.map((r) => ({
        source: r.utmSource ?? "direct",
        count: r.total,
      })),
    });
  });
}
