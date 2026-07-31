

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateSources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const SUPPORTED_PLATFORMS = ["LINKEDIN", "NAUKRI", "INDEED", "ORGANIC"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

const upsertPortalSchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS),
  isActive: z.boolean().default(true),
  oauthToken: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const portals = await db
      .select({
        id: candidateSources.id,
        platform: candidateSources.platform,
        isActive: candidateSources.isActive,
        lastSyncedAt: candidateSources.lastSyncedAt,
        lastSyncCount: candidateSources.lastSyncCount,
        createdAt: candidateSources.createdAt,
      })
      .from(candidateSources)
      .where(eq(candidateSources.orgId, session.orgId))
      .orderBy(candidateSources.platform);

    return ok(portals);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden: Admin role required", 403);
    }

    const body = await parseBody(req, upsertPortalSchema);

    const existing = await db
      .select({ id: candidateSources.id })
      .from(candidateSources)
      .where(
        and(
          eq(candidateSources.orgId, session.orgId),
          eq(candidateSources.platform, body.platform as Platform)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(candidateSources)
        .set({
          isActive: body.isActive,
          ...(body.oauthToken !== undefined && { oauthToken: body.oauthToken }),
          ...(body.meta !== undefined && { meta: body.meta }),
          updatedAt: new Date(),
        })
        .where(eq(candidateSources.id, existing[0]!.id))
        .returning();

      return ok(updated);
    }

    const [created] = await db
      .insert(candidateSources)
      .values({
        orgId: session.orgId,
        platform: body.platform,
        isActive: body.isActive,
        oauthToken: body.oauthToken,
        meta: body.meta as Record<string, unknown> | undefined,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
