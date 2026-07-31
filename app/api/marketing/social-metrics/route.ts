import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { socialMetrics } from "@/lib/db/schema/marketing";
import { and, eq, gte, desc, asc } from "drizzle-orm";

const PostSchema = z.object({
  platform: z.enum(["linkedin", "twitter", "instagram", "facebook", "youtube"]),
  metricDate: z.string().min(1),
  followers: z.number().int().min(0),
  impressions: z.number().int().min(0).optional().default(0),
  engagements: z.number().int().min(0).optional().default(0),
  clicks: z.number().int().min(0).optional().default(0),
  shares: z.number().int().min(0).optional().default(0),
  comments: z.number().int().min(0).optional().default(0),
  reach: z.number().int().min(0).optional().default(0),
});


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const sp = req.nextUrl.searchParams;
    const platform = sp.get("platform") ?? undefined;
    const period = toNumber(sp.get("period")) ?? 30;

    const since = new Date();
    since.setDate(since.getDate() - period);
    const sinceStr = since.toISOString().split("T")[0];

    const conditions = [
      eq(socialMetrics.orgId, session.orgId),
      gte(socialMetrics.metricDate, sinceStr),
    ];
    if (platform) {
      conditions.push(eq(socialMetrics.platform, platform));
    }

    const rows = await db
      .select()
      .from(socialMetrics)
      .where(and(...conditions))
      .orderBy(desc(socialMetrics.metricDate))
      .limit(100);

    const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const totalClicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const avgEngagement =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + (r.engagements ?? 0), 0) / rows.length)
        : 0;

    let followerGrowth = 0;
    const earliestRows = await db
      .select({ followers: socialMetrics.followers })
      .from(socialMetrics)
      .where(and(...conditions))
      .orderBy(asc(socialMetrics.metricDate))
      .limit(1);
    const latestRows = await db
      .select({ followers: socialMetrics.followers })
      .from(socialMetrics)
      .where(and(...conditions))
      .orderBy(desc(socialMetrics.metricDate))
      .limit(1);
    if (earliestRows[0] && latestRows[0]) {
      followerGrowth = (latestRows[0].followers ?? 0) - (earliestRows[0].followers ?? 0);
    }

    return ok({
      metrics: rows.map((r) => ({
        id: r.id,
        platform: r.platform,
        metricDate: r.metricDate,
        followers: r.followers ?? 0,
        impressions: r.impressions ?? 0,
        engagements: r.engagements ?? 0,
        clicks: r.clicks ?? 0,
        shares: r.shares ?? 0,
        comments: r.comments ?? 0,
        reach: r.reach ?? 0,
        createdAt: r.createdAt?.toISOString() ?? "",
      })),
      summary: { avgEngagement, totalImpressions, totalClicks, followerGrowth },
    });
  });
}


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400);
    }

    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const data = parsed.data;

    const existingRows = await db
      .select({ id: socialMetrics.id })
      .from(socialMetrics)
      .where(
        and(
          eq(socialMetrics.orgId, session.orgId),
          eq(socialMetrics.platform, data.platform),
          eq(socialMetrics.metricDate, data.metricDate)
        )
      )
      .limit(1);
    const existing = existingRows[0];

    let row;
    if (existing) {
      const [updated] = await db
        .update(socialMetrics)
        .set({
          followers: data.followers,
          impressions: data.impressions,
          engagements: data.engagements,
          clicks: data.clicks,
          shares: data.shares,
          comments: data.comments,
          reach: data.reach,
          recordedBy: session.user.id ?? null,
        })
        .where(eq(socialMetrics.id, existing.id))
        .returning();
      row = updated;
    } else {
      const [created] = await db
        .insert(socialMetrics)
        .values({
          orgId: session.orgId,
          platform: data.platform,
          metricDate: data.metricDate,
          followers: data.followers,
          impressions: data.impressions,
          engagements: data.engagements,
          clicks: data.clicks,
          shares: data.shares,
          comments: data.comments,
          reach: data.reach,
          recordedBy: session.user.id ?? null,
        })
        .returning();
      row = created;
    }

    return ok(
      {
        id: row.id,
        platform: row.platform,
        metricDate: row.metricDate,
        followers: row.followers ?? 0,
        impressions: row.impressions ?? 0,
        engagements: row.engagements ?? 0,
        clicks: row.clicks ?? 0,
        shares: row.shares ?? 0,
        comments: row.comments ?? 0,
        reach: row.reach ?? 0,
        createdAt: row.createdAt?.toISOString() ?? "",
      },
      201
    );
  });
}
