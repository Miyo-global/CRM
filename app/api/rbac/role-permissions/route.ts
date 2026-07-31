import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getRolePermissions } from "@/server/queries/rbac";
import { db } from "@/lib/db";
import { rolePermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { checkPermission } from "@/lib/rbac/middleware";
import { z } from "zod";

const updateSchema = z.object({
  role: z.string(),
  permissionId: z.number(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, session.user.id),
      });

      const hasAccess = await checkPermission(
        db,
        session.user.id,
        session.orgId,
        user?.role,
        "settings:rbac:manage"
      );

      if (!hasAccess) return err("Permission denied", 403);

      const role = req.nextUrl.searchParams.get("role");
      if (!role) return err("role is required", 400);

      const data = await getRolePermissions(role, session.orgId);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load role permissions",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, session.user.id),
      });

      const hasAccess = await checkPermission(
        db,
        session.user.id,
        session.orgId,
        user?.role,
        "settings:rbac:manage"
      );

      if (!hasAccess) return err("Permission denied", 403);

      const body = await req.json();
      const input = updateSchema.parse(body);

      const existing = await db.query.rolePermissions.findFirst({
        where: and(
          eq(rolePermissions.role, input.role),
          eq(rolePermissions.permissionId, input.permissionId),
          eq(rolePermissions.orgId, session.orgId)
        ),
      });

      if (!existing) {
        await db.insert(rolePermissions).values({
          role: input.role,
          permissionId: input.permissionId,
          orgId: session.orgId,
        });
      }

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to assign role permission",
        500
      );
    }
  });
}
