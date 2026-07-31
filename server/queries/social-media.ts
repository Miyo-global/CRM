"server-only";

import { db } from "@/lib/db";
import { socialMediaStats } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const platformValues = [
  "instagram",
  "twitter",
  "linkedin",
  "facebook",
  "youtube",
] as const;

export async function getLatestSocialMediaStats(orgId: string) {
  type StatRow = typeof socialMediaStats.$inferSelect;
  const platforms: Record<
    string,
    {
      latest: StatRow | null;
      previous: StatRow | null;
    }
  > = {};
  for (const platform of platformValues) {
    platforms[platform] = { latest: null, previous: null };
  }

  const ranked = db
    .select({
      row: socialMediaStats,
      rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${socialMediaStats.platform} ORDER BY ${socialMediaStats.date} DESC, ${socialMediaStats.id} DESC)`.as(
        "rn"
      ),
    })
    .from(socialMediaStats)
    .where(eq(socialMediaStats.orgId, orgId))
    .as("ranked");

  const rows = await db
    .select()
    .from(ranked)
    .where(sql`${ranked.rn} <= 2`)
    .orderBy(desc(sql`${ranked.rn}`));

  for (const entry of rows) {
    const row = entry.row as StatRow;
    const target = platforms[row.platform];
    if (!target) continue;
    if (Number(entry.rn) === 1) {
      target.latest = row;
    } else if (Number(entry.rn) === 2) {
      target.previous = row;
    }
  }

  return platforms;
}
