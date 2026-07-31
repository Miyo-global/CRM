import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  organizationMembers, users, payrolls, leaveBalances,
  policyAcknowledgments, certifications, backgroundVerifications,
} from "@/lib/db/schema";
import { eq, and, sql, count, lte, gte } from "drizzle-orm";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
    const todayStr = now.toISOString().split("T")[0];
    const futureStr = thirtyDaysAhead.toISOString().split("T")[0];

    const [
      totalEmployees,
      pendingAcks,
      expiringCerts,
      pendingBgv,
      payrollsMissing,
    ] = await Promise.all([
      db.select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))),

      db.select({ count: count() })
        .from(policyAcknowledgments)
        .where(and(eq(policyAcknowledgments.orgId, orgId), eq(policyAcknowledgments.status, "PENDING"))),

      db.select({ count: count() })
        .from(certifications)
        .where(and(
          eq(certifications.orgId, orgId),
          lte(certifications.expiryDate, futureStr),
          gte(certifications.expiryDate, todayStr)
        )),

      db.select({ count: count() })
        .from(backgroundVerifications)
        .where(and(eq(backgroundVerifications.orgId, orgId), eq(backgroundVerifications.status, "PENDING"))),

      db.select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(
          eq(organizationMembers.orgId, orgId),
          eq(users.isActive, true),
          sql`${users.id} NOT IN (SELECT user_id FROM payrolls WHERE org_id = ${orgId} AND month = to_char(now(), 'YYYY-MM'))`
        )),
    ]);

    const total = Number(totalEmployees[0]?.count ?? 0);
    const checks = [
      {
        name: "Policy Acknowledgments",
        status: Number(pendingAcks[0]?.count ?? 0) === 0 ? "COMPLIANT" : "ACTION_NEEDED",
        pending: Number(pendingAcks[0]?.count ?? 0),
        description: "Pending policy acknowledgments from employees",
      },
      {
        name: "Certification Expiry",
        status: Number(expiringCerts[0]?.count ?? 0) === 0 ? "COMPLIANT" : "WARNING",
        pending: Number(expiringCerts[0]?.count ?? 0),
        description: "Certifications expiring within 30 days",
      },
      {
        name: "Background Verification",
        status: Number(pendingBgv[0]?.count ?? 0) === 0 ? "COMPLIANT" : "ACTION_NEEDED",
        pending: Number(pendingBgv[0]?.count ?? 0),
        description: "Pending background verifications",
      },
      {
        name: "Payroll Processing",
        status: Number(payrollsMissing[0]?.count ?? 0) === 0 ? "COMPLIANT" : "WARNING",
        pending: Number(payrollsMissing[0]?.count ?? 0),
        description: "Employees without payroll for current month",
      },
    ];

    const compliantCount = checks.filter((c) => c.status === "COMPLIANT").length;
    const overallScore = Math.round((compliantCount / checks.length) * 100);

    return ok({
      totalEmployees: total,
      overallComplianceScore: overallScore,
      checks,
    });
  });
}
