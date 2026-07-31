import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizations, organizationMembers } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export async function GET() {
  return withAuth(async (session) => {
    const memberships = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.userId, session.user.id),
      orderBy: [desc(organizationMembers.joinedAt)],
    });

    if (memberships.length === 0) return ok([]);

    const orgIds = memberships.map((m) => m.orgId);
    const orgs = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.id, orgIds));

    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    return ok(
      memberships.map((m) => {
        const org = orgMap.get(m.orgId);
        return {
          id: org?.id ?? m.orgId,
          name: org?.name ?? "Unknown",
          slug: org?.slug ?? "",
          role: m.role,
          joinedAt: m.joinedAt,
        };
      })
    );
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createOrgSchema);

    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, input.slug),
    });

    if (existing) return err("Organization slug already exists", 409);

    const orgId = nanoid();

    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({ id: orgId, name: input.name, slug: input.slug });
      await tx.insert(organizationMembers).values({
        userId: session.user.id,
        orgId,
        role: "CEO",
      });
    });

    return ok({ id: orgId, name: input.name, slug: input.slug }, 201);
  });
}
