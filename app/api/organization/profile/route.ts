import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizations, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) return err("User not found", 404);

    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
      })
      .from(organizations)
      .where(eq(organizations.id, session.orgId));

    const [membership] = await db
      .select({
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.orgId, session.orgId),
        ),
      );

    return ok({
      user,
      organization: org,
      membership: membership ?? null,
    });
  });
}
