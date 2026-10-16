import { type NextRequest } from "next/server";
import { withAuth, ok, err, serverError } from "@/lib/api/helpers";
import { getRoles } from "@/server/queries/roles";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z_]+$/),
  permissions: z.array(z.string()).default([]),
});

export async function GET() {
  return withAuth(async (session) => {
    try {
      // The whole role-to-permission map was enumerable by any employee
      // (QA-0064). Non-admins get only their own effective permissions.
      if (!isAdminOrOwner(session.user.role)) {
        const own = (await getRoles(session.orgId)).find(
          (role) => role.slug === session.user.role,
        );
        return ok(own ? [own] : []);
      }

      const data = await getRoles(session.orgId);
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "roles", orgId: session.orgId }, "Failed to load roles.");
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Only CEO or Admin can create roles", 403);
      }

      const body = await req.json();
      const input = createSchema.parse(body);

      const existing = await db.query.roles.findFirst({
        where: and(
          eq(roles.slug, input.slug),
          eq(roles.orgId, session.orgId)
        ),
      });
      if (existing) return err("A role with this slug already exists", 409);

      const [created] = await db
        .insert(roles)
        .values({
          name: input.name,
          slug: input.slug,
          orgId: session.orgId,
          isSystem: false,
          permissions: input.permissions,
        })
        .returning();

      void createAuditLog({
        action: "role.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(created.id),
        targetType: "role",
        metadata: { name: created.name, slug: created.slug },
      }).catch(() => {});

      return ok(created, 201);
    } catch (error) {
      return serverError(error, { route: "roles", orgId: session.orgId }, "Failed to create role.");
    }
  });
}
