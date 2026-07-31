import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getBranch } from "@/server/queries/branches";
import { db } from "@/lib/db";
import { branches, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { updateBranchSchema as updateSchema } from "@/lib/validations/branch";

async function assertOrgMember(orgId: string, userId: string): Promise<boolean> {
  const member = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId)),
    columns: { userId: true },
  });
  return !!member;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const branch = await getBranch(session.orgId, branchId);
      if (!branch) return err("Branch not found", 404);
      return ok(branch);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load branch",
        500
      );
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (!["HR", "CEO"].includes(role)) {
        return err("Forbidden", 403);
      }

      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const body = await req.json();
      const data = updateSchema.parse(body);

      const existing = await db.query.branches.findFirst({
        where: and(eq(branches.id, branchId), eq(branches.orgId, session.orgId)),
        columns: { id: true, branchManagerId: true, branchHrId: true },
      });
      if (!existing) return err("Branch not found", 404);

      if (data.branchManagerId && !(await assertOrgMember(session.orgId, data.branchManagerId))) {
        return err("Branch manager does not belong to this organisation", 400);
      }
      if (data.branchHrId && !(await assertOrgMember(session.orgId, data.branchHrId))) {
        return err("Branch HR does not belong to this organisation", 400);
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(branches)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(branches.id, branchId), eq(branches.orgId, session.orgId)))
          .returning();

        if (data.branchManagerId !== undefined && data.branchManagerId !== existing.branchManagerId) {
          if (existing.branchManagerId) {
            await tx.update(users).set({ branchId: null })
              .where(and(eq(users.id, existing.branchManagerId), eq(users.branchId, branchId)));
          }
          if (data.branchManagerId) {
            await tx.update(users).set({ branchId: branchId }).where(eq(users.id, data.branchManagerId));
          }
        }
        if (data.branchHrId !== undefined && data.branchHrId !== existing.branchHrId) {
          if (existing.branchHrId) {
            await tx.update(users).set({ branchId: null })
              .where(and(eq(users.id, existing.branchHrId), eq(users.branchId, branchId)));
          }
          if (data.branchHrId) {
            await tx.update(users).set({ branchId: branchId }).where(eq(users.id, data.branchHrId));
          }
        }
        return row;
      });

      return ok(updated);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update branch",
        500
      );
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (!["HR", "CEO"].includes(role)) {
        return err("Forbidden", 403);
      }

      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const deleted = await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(branches)
          .where(and(eq(branches.id, branchId), eq(branches.orgId, session.orgId)))
          .returning();
        if (!row) return undefined;
        await tx
          .update(users)
          .set({ branchId: null })
          .where(
            and(
              eq(users.branchId, branchId),
              inArray(
                users.id,
                tx
                  .select({ userId: organizationMembers.userId })
                  .from(organizationMembers)
                  .where(eq(organizationMembers.orgId, session.orgId)),
              ),
            ),
          );
        return row;
      });

      if (!deleted) return err("Branch not found", 404);
      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to delete branch",
        500
      );
    }
  });
}
