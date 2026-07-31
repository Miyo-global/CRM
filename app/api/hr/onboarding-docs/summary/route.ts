import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes, onboardingDocuments, departments } from "@/lib/db/schema/hr";
import { users, organizationMembers } from "@/lib/db/schema/auth";
import { eq, and, desc } from "drizzle-orm";
import {
  progressForRequiredDocs,
  requiredDocumentTypesForRole,
} from "@/lib/hr/document-type-requirements";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const allTypes = await db
      .select({
        id: documentTypes.id,
        name: documentTypes.name,
        isMandatory: documentTypes.isMandatory,
        isActive: documentTypes.isActive,
        applicableRoles: documentTypes.applicableRoles,
        sortOrder: documentTypes.sortOrder,
      })
      .from(documentTypes)
      .where(eq(documentTypes.orgId, session.orgId));

    const employees = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        employeeId: users.employeeId,
        role: organizationMembers.role,
        departmentName: departments.name,
      })
      .from(users)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.userId, users.id),
          eq(organizationMembers.orgId, session.orgId),
        ),
      )
      .leftJoin(
        departments,
        and(
          eq(users.departmentId, departments.id),
          eq(departments.orgId, session.orgId),
        ),
      )
      .where(eq(users.isActive, true));

    if (employees.length === 0) return ok([]);

    const employeeIds = employees.map((e) => e.id);

    const allDocs = await db
      .select({
        userId: onboardingDocuments.userId,
        documentTypeId: onboardingDocuments.documentTypeId,
        status: onboardingDocuments.status,
      })
      .from(onboardingDocuments)
      .where(eq(onboardingDocuments.orgId, session.orgId))
      .orderBy(desc(onboardingDocuments.id));

    const userDocMap = new Map<string, Map<number, string>>();

    for (const doc of allDocs) {
      if (!employeeIds.includes(doc.userId)) continue;

      if (!userDocMap.has(doc.userId)) {
        userDocMap.set(doc.userId, new Map());
      }
      const typeMap = userDocMap.get(doc.userId)!;
      if (!typeMap.has(doc.documentTypeId)) {
        typeMap.set(doc.documentTypeId, doc.status ?? "SUBMITTED");
      }
    }

    const summary = employees.map((emp) => {
      const typeMap = userDocMap.get(emp.id) ?? new Map<number, string>();
      const requiredTypes = requiredDocumentTypesForRole(allTypes, emp.role);
      const progress = progressForRequiredDocs(requiredTypes, typeMap);

      return {
        userId: emp.id,
        userName: emp.name,
        userImage: emp.image,
        designation: emp.designation,
        employeeId: emp.employeeId,
        role: emp.role,
        departmentName: emp.departmentName,
        totalRequired: progress.totalRequired,
        totalSubmitted:
          progress.totalApproved +
          progress.totalPendingReview +
          progress.totalRejected,
        totalApproved: progress.totalApproved,
        totalRejected: progress.totalRejected,
        totalPendingReview: progress.totalPendingReview,
        totalMissing: progress.totalMissing,
        requiredDocNames: requiredTypes.map((t) => t.name),
        onboardingDocStatus:
          progress.derivedStatus === "NOT_REQUIRED"
            ? "APPROVED"
            : progress.derivedStatus,
      };
    });

    return ok(summary);
  });
}
