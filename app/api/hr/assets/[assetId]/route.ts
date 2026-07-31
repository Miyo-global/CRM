import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assets, assetAssignmentHistory, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { notifyAssetAssignment } from "@/lib/email/hr-assets";
import {
  needsAssetReassignmentReason,
  validateReassignmentReason,
} from "@/lib/hr/asset-assignment-lifecycle";
import { countAssetAssignments } from "@/server/queries/hr/assets";
import { assetFormSchema, assetPatchSchema, DUPLICATE_SERIAL_MESSAGE } from "@/lib/validations/hr-assets";

const patchAssetSchema = assetPatchSchema;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update assets.", 403);
    }

    const { assetId: id } = await params;
    const assetId = Number(id);
    if (isNaN(assetId)) return err("Invalid asset ID.", 400);

    const body = await parseBody(req, patchAssetSchema);

    if (body.status === "ASSIGNED") {
      const aid = typeof body.assignedTo === "string" ? body.assignedTo.trim() : "";
      if (!aid) {
        return err("Assigned status requires an employee.", 400);
      }
      const assignedMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, aid),
          eq(organizationMembers.orgId, session.orgId),
        ),
      });
      if (!assignedMember) {
        return err("Assigned employee is not a member of this organization.", 400);
      }
    } else if (body.assignedTo) {
      const assignedMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, body.assignedTo),
          eq(organizationMembers.orgId, session.orgId),
        ),
      });
      if (!assignedMember) {
        return err("Assigned employee is not a member of this organization.", 400);
      }
    }

    const updatePayload: Partial<typeof assets.$inferInsert> = {};

    if (body.name) updatePayload.name = body.name;
    if (body.type) updatePayload.type = body.type;
    if (body.serialNumber !== undefined) updatePayload.serialNumber = body.serialNumber;
    if (body.brand !== undefined) updatePayload.brand = body.brand || null;
    if (body.model !== undefined) updatePayload.model = body.model || null;

    if (body.status !== undefined) {
      updatePayload.status = body.status;
      if (body.status === "ASSIGNED") {
        updatePayload.assignedTo = String(body.assignedTo ?? "").trim() || null;
      } else {
        updatePayload.assignedTo = null;
      }
    } else if (body.assignedTo !== undefined) {
      const aid = String(body.assignedTo).trim();
      updatePayload.assignedTo = aid || null;
      updatePayload.status = aid ? "ASSIGNED" : "AVAILABLE";
    }
    if (body.location !== undefined) updatePayload.location = body.location || null;
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    if (body.purchaseCost !== undefined) {
      updatePayload.purchaseCost = body.purchaseCost.toString();
    }
    if (body.purchaseDate !== undefined) {
      updatePayload.purchaseDate = body.purchaseDate
        ? formatDateOnly(new Date(body.purchaseDate))
        : null;
    }
    updatePayload.updatedAt = new Date();

    const existing = await db.query.assets.findFirst({
      where: and(eq(assets.id, assetId), eq(assets.orgId, session.orgId)),
      columns: {
        assignedTo: true,
        name: true,
        type: true,
        serialNumber: true,
        brand: true,
        model: true,
        status: true,
      },
    });
    if (!existing) return err("Asset not found.", 404);

    const assigneeAfter =
      updatePayload.assignedTo !== undefined
        ? updatePayload.assignedTo
        : existing.assignedTo ?? null;

    const priorAssignmentCount = await countAssetAssignments(session.orgId, assetId);
    const reasonRequired = needsAssetReassignmentReason({
      priorAssignmentCount,
      previousAssigneeId: existing.assignedTo,
      nextAssigneeId: typeof assigneeAfter === "string" ? assigneeAfter : null,
    });
    const reasonError = validateReassignmentReason(body.reassignmentReason, reasonRequired);
    if (reasonError) return err(reasonError, 400);

    const mergedType = body.type ?? existing.type ?? "";
    const mergedSerial =
      body.serialNumber !== undefined ? body.serialNumber || "" : existing.serialNumber ?? "";
    const mergedBrand = body.brand !== undefined ? body.brand || "" : existing.brand ?? "";
    const mergedModel = body.model !== undefined ? body.model || "" : existing.model ?? "";
    const mergedStatus = body.status ?? existing.status ?? "AVAILABLE";
    const mergedAssignedTo =
      body.assignedTo !== undefined
        ? String(body.assignedTo).trim()
        : body.status === "ASSIGNED"
          ? String(body.assignedTo ?? existing.assignedTo ?? "").trim()
          : existing.assignedTo ?? "";

    const mergedValidation = assetFormSchema.safeParse({
      name: body.name ?? existing.name ?? "",
      type: mergedType,
      status: mergedStatus,
      serialNumber: mergedSerial,
      brand: mergedBrand,
      model: mergedModel,
      assignedTo: mergedStatus === "ASSIGNED" ? mergedAssignedTo : "",
      purchaseDate: body.purchaseDate,
      purchaseCost: body.purchaseCost,
      location: body.location,
      notes: body.notes,
    });
    if (!mergedValidation.success) {
      return err(mergedValidation.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const serialToCheck = mergedValidation.data.serialNumber?.trim();
    if (serialToCheck) {
      const duplicate = await db.query.assets.findFirst({
        where: and(
          eq(assets.orgId, session.orgId),
          eq(assets.serialNumber, serialToCheck),
          ne(assets.id, assetId),
        ),
        columns: { id: true },
      });
      if (duplicate) {
        return err(DUPLICATE_SERIAL_MESSAGE, 409);
      }
    }

    await db
      .update(assets)
      .set(updatePayload)
      .where(
        and(eq(assets.id, assetId), eq(assets.orgId, session.orgId))
      );

    if (typeof assigneeAfter === "string" && assigneeAfter && assigneeAfter !== existing.assignedTo) {
      await db.insert(assetAssignmentHistory).values({
        orgId: session.orgId,
        assetId,
        fromUserId: existing.assignedTo,
        toUserId: assigneeAfter,
        reason: body.reassignmentReason?.trim() || null,
        assignedBy: session.user.id,
      });

      void (async () => {
        const assigner = await db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: { name: true },
        });
        await notifyAssetAssignment({
          orgId: session.orgId,
          assigneeUserId: assigneeAfter,
          assignerName: assigner?.name ?? session.user.name ?? "Admin",
          assetName: body.name ?? existing?.name ?? "Asset",
          assetType: body.type ?? existing?.type ?? "Equipment",
          serialNumber: body.serialNumber ?? existing?.serialNumber ?? null,
        });
      })().catch(() => {});
    }

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can delete assets.", 403);
    }

    const { assetId: id } = await params;
    const assetId = Number(id);
    if (isNaN(assetId)) return err("Invalid asset ID.", 400);

    const existing = await db.query.assets.findFirst({
      where: and(eq(assets.id, assetId), eq(assets.orgId, session.orgId)),
    });
    if (!existing) return err("Asset not found.", 404);

    await db
      .delete(assets)
      .where(and(eq(assets.id, assetId), eq(assets.orgId, session.orgId)));

    return ok({ success: true });
  });
}
