import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface DirectReport {
  id: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  email: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  return withAuth<DirectReport[]>(async (session) => {
    const { employeeId } = await params;

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, employeeId),
        eq(organizationMembers.orgId, session.orgId),
      ),
    });
    if (!member) return err("Employee not found", 404);

    const reports = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        email: users.email,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          eq(users.reportingTo, employeeId),
          eq(users.isActive, true),
        ),
      );

    return ok(reports);
  });
}
