import { withAuth, withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { alumniProfiles, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  leftDate: z.string().optional(),
  isOptedIn: z.boolean().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(alumniProfiles)
      .where(eq(alumniProfiles.orgId, session.orgId))
      .orderBy(desc(alumniProfiles.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = createSchema.parse(await req.json());

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);

    const [record] = await db
      .insert(alumniProfiles)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        currentCompany: body.currentCompany ?? null,
        currentRole: body.currentRole ?? null,
        linkedinUrl: body.linkedinUrl ?? null,
        email: body.email ?? null,
        leftDate: body.leftDate ?? null,
        isOptedIn: body.isOptedIn ?? true,
      })
      .returning();

    return ok(record, 201);
  });
}
