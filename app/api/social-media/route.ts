import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { socialMediaStats } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { dateOnlySchema } from "@/lib/validations/date";

const platformValues = [
  "instagram",
  "twitter",
  "linkedin",
  "facebook",
  "youtube",
] as const;

const upsertSchema = z.object({
  platform: z.enum(platformValues),
  date: dateOnlySchema.refine(
    (v) => v <= new Date().toISOString().slice(0, 10),
    { message: "date cannot be in the future" }
  ),
  postsPublished: z.number().int().min(0).default(0),
  storiesReels: z.number().int().min(0).default(0),
  followersTotal: z.number().int().min(0).default(0),
  engagementRate: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n.toFixed(2) : null;
    }),
  impressions: z.number().int().min(0).default(0),
  reach: z.number().int().min(0).default(0),
  linkClicks: z.number().int().min(0).default(0),
  profileVisits: z.number().int().min(0).default(0),
});

const SOCIAL_STATS_WRITE_ROLES = new Set([
  "DIGITAL_MARKETING",
  "CEO",
  "ADMIN",
]);

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role;
      if (!role || !SOCIAL_STATS_WRITE_ROLES.has(role)) {
        return err("Forbidden", 403);
      }

      const body = await req.json();
      const input = upsertSchema.parse(body);
      const orgId = session.orgId;

      const [existing] = await db
        .select({ id: socialMediaStats.id })
        .from(socialMediaStats)
        .where(
          and(
            eq(socialMediaStats.orgId, orgId),
            eq(socialMediaStats.platform, input.platform),
            eq(socialMediaStats.date, input.date),
          ),
        )
        .limit(1);

      let saved;
      if (existing) {
        [saved] = await db
          .update(socialMediaStats)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(socialMediaStats.id, existing.id))
          .returning();
      } else {
        [saved] = await db
          .insert(socialMediaStats)
          .values({ orgId, ...input, enteredBy: session.user.id })
          .returning();
      }

      return ok(saved);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to upsert social media stats",
        500
      );
    }
  });
}
