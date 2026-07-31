import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assetReturns, organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { listAssetReturnsForSession } from "@/server/queries/hr/asset-returns";

const createSchema = z.object({
  userId: z.string().min(1),
  assetId: z.number().int().positive().optional(),
  assetName: z.string().min(1, "Asset name is required"),
  assetType: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
  condition: z.string().optional(),
  handoverPhotoUrls: z
    .array(z.string().min(1))
    .min(1, "At least one handover photo is required"),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await listAssetReturnsForSession({
      orgId: session.orgId,
      userId: session.user.id,
      role: session.user.role,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = createSchema.parse(await req.json());

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId),
      ),
      columns: { userId: true },
    });
    if (!targetMember) {
      return err("Target user is not a member of your organization.", 403);
    }

    const [record] = await db
      .insert(assetReturns)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        assetId: body.assetId ?? null,
        assetName: body.assetName,
        notes: body.notes ?? null,
        condition: body.condition ?? null,
        handoverPhotoUrls: body.handoverPhotoUrls,
        status: "PENDING",
      })
      .returning();

    return ok(record, 201);
  });
}
