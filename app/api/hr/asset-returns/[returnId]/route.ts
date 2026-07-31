import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assetReturns, assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  canSeeAllAssetReturns,
  getAssetReturnById,
} from "@/server/queries/hr/asset-returns";

const patchSchema = z.object({
  assetName: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  handoverPhotoUrls: z.array(z.string().min(1)).optional(),
  status: z.enum(["PENDING", "RETURNED", "DAMAGED", "LOST", "MISSING"]).optional(),
  returnedAt: z.string().nullable().optional(),
});

function isTerminalStatus(s: string | null | undefined): boolean {
  return (
    s === "RETURNED" || s === "DAMAGED" || s === "LOST" || s === "MISSING"
  );
}

type RouteParams = { params: Promise<{ returnId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { returnId: id } = await params;
    const returnId = Number(id);
    if (!Number.isFinite(returnId)) return err("Invalid asset return ID.", 400);

    const row = await getAssetReturnById({ orgId: session.orgId, id: returnId });
    if (!row) return err("Asset return record not found.", 404);

    const allowed =
      canSeeAllAssetReturns(session.user.role) || row.userId === session.user.id;
    if (!allowed) {
      return err("Forbidden", 403);
    }

    return ok(row);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAdmin(async (session) => {
    const { returnId: id } = await params;
    const returnId = Number(id);
    if (!Number.isFinite(returnId)) return err("Invalid asset return ID.", 400);

    const body = await parseBody(req, patchSchema);
    if (Object.keys(body).length === 0) {
      return err("No fields to update.", 400);
    }

    const [existing] = await db
      .select()
      .from(assetReturns)
      .where(
        and(eq(assetReturns.id, returnId), eq(assetReturns.orgId, session.orgId)),
      );

    if (!existing) return err("Asset return record not found.", 404);

    const updates: Record<string, unknown> = {};

    if (body.assetName !== undefined) updates.assetName = body.assetName;
    if (body.userId !== undefined) updates.userId = body.userId;
    if (body.notes !== undefined) updates.notes = body.notes === "" ? null : body.notes;
    if (body.condition !== undefined) {
      updates.condition = body.condition === "" ? null : body.condition;
    }
    if (body.handoverPhotoUrls !== undefined) {
      updates.handoverPhotoUrls = body.handoverPhotoUrls;
    }
    if (body.status !== undefined) updates.status = body.status;

    if (body.returnedAt !== undefined) {
      updates.returnedAt = body.returnedAt ? new Date(body.returnedAt) : null;
    } else if (body.status !== undefined) {
      if (body.status === "PENDING") {
        updates.returnedAt = null;
      } else if (isTerminalStatus(body.status) && !isTerminalStatus(existing.status)) {
        updates.returnedAt = new Date();
      }
    }

    const [updated] = await db
      .update(assetReturns)
      .set(updates)
      .where(
        and(eq(assetReturns.id, returnId), eq(assetReturns.orgId, session.orgId)),
      )
      .returning();

    const newStatus = updates.status as string | undefined ?? existing.status;
    if (
      existing.assetId &&
      isTerminalStatus(newStatus) &&
      !isTerminalStatus(existing.status)
    ) {
      const assetStatus =
        newStatus === "RETURNED"
          ? "AVAILABLE"
          : newStatus === "DAMAGED"
            ? "MAINTENANCE"
            : "RETIRED";
      await db
        .update(assets)
        .set({
          status: assetStatus as "AVAILABLE" | "MAINTENANCE" | "RETIRED",
          assignedTo: null,
          updatedAt: new Date(),
        })
        .where(and(eq(assets.id, existing.assetId), eq(assets.orgId, session.orgId)));
    }

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAdmin(async (session) => {
    const { returnId: id } = await params;
    const returnId = Number(id);
    if (!Number.isFinite(returnId)) return err("Invalid asset return ID.", 400);

    const [existing] = await db
      .select({ id: assetReturns.id })
      .from(assetReturns)
      .where(
        and(eq(assetReturns.id, returnId), eq(assetReturns.orgId, session.orgId)),
      );

    if (!existing) return err("Asset return record not found.", 404);

    await db
      .delete(assetReturns)
      .where(
        and(eq(assetReturns.id, returnId), eq(assetReturns.orgId, session.orgId)),
      );

    return ok({ success: true });
  });
}
