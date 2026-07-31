import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getBranches } from "@/server/queries/branches";
import { db } from "@/lib/db";
import { branches, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { createBranchSchema as createSchema } from "@/lib/validations/branch";
import { isAdminOrOwner } from "@/lib/constants/roles";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getBranches(session.orgId);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load branches",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("You do not have permission to create branches", 403);
      }

      const body = await req.json();
      const input = createSchema.parse(body);

      if (input.branchManagerId) {
        const member = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, input.branchManagerId),
            eq(organizationMembers.orgId, session.orgId),
          ),
          columns: { userId: true },
        });
        if (!member) return err("Branch manager does not belong to this organisation", 400);
      }
      if (input.branchHrId) {
        const member = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, input.branchHrId),
            eq(organizationMembers.orgId, session.orgId),
          ),
          columns: { userId: true },
        });
        if (!member) return err("Branch HR does not belong to this organisation", 400);
      }

      const branch = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(branches)
          .values({ orgId: session.orgId, ...input })
          .returning();

        if (input.branchManagerId) {
          await tx
            .update(users)
            .set({ branchId: created.id })
            .where(eq(users.id, input.branchManagerId));
        }
        if (input.branchHrId) {
          await tx
            .update(users)
            .set({ branchId: created.id })
            .where(eq(users.id, input.branchHrId));
        }

        return created;
      });

      void createAuditLog({
        action: "branch.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(branch.id),
        targetType: "branch",
        metadata: { name: branch.name, code: branch.code },
      });

      return ok(branch, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create branch",
        500
      );
    }
  });
}
