import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const conditions = [
        eq(organizationMembers.orgId, session.orgId),
        eq(users.isActive, true),
      ];

      const members = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          name: users.name,
          email: users.email,
          image: users.image,
          role: users.role,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(...conditions))
        .orderBy(asc(users.firstName));

      return ok(members);
    } catch (error) {
      logger.error("Failed", error);
      return err("Failed", 500);
    }
  });
}
