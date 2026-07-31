import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, isNotNull, count, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";


export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!role || !["CEO", "ADMIN", "HR", "BRANCH_HR", "BRANCH_MANAGER"].includes(role)) {
      return err("Forbidden", 403);
    }

    const cacheKey = `hr:compliance:${session.orgId}`;
    const data = await cached(cacheKey, async () => {
      const members = await db
        .select({
          userId: organizationMembers.userId,
          taxId: users.taxId,
          bankDetails: users.bankDetails,
          dateOfBirth: users.dateOfBirth,
          joiningDate: users.joiningDate,
          gender: users.gender,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.orgId, session.orgId));

      const total = members.length;

      const checks = [
        {
          label: "Bank Details",
          key: "bankDetails",
          count: members.filter((m) => m.bankDetails !== null).length,
        },
        {
          label: "Tax ID (PAN/TAN)",
          key: "taxId",
          count: members.filter((m) => m.taxId !== null && m.taxId !== "").length,
        },
        {
          label: "Date of Birth",
          key: "dateOfBirth",
          count: members.filter((m) => m.dateOfBirth !== null).length,
        },
        {
          label: "Joining Date",
          key: "joiningDate",
          count: members.filter((m) => m.joiningDate !== null).length,
        },
        {
          label: "Gender / Profile",
          key: "gender",
          count: members.filter((m) => m.gender !== null).length,
        },
      ];

      const overallCompliant = members.filter(
        (m) =>
          m.bankDetails !== null &&
          m.taxId !== null &&
          m.taxId !== "" &&
          m.dateOfBirth !== null &&
          m.joiningDate !== null &&
          m.gender !== null,
      ).length;

      return {
        total,
        overallCompliant,
        overallPct: total > 0 ? Math.round((overallCompliant / total) * 100) : 0,
        checks: checks.map((c) => ({
          label: c.label,
          compliant: c.count,
          missing: total - c.count,
          pct: total > 0 ? Math.round((c.count / total) * 100) : 0,
        })),
      };
    });

    return ok(data);
  });
}
