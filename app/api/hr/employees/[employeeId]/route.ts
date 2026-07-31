import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getEmployee } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { users, organizationMembers, onboardingTasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { differenceInDays, addDays } from "date-fns";
import type { NextRequest } from "next/server";
import { updateEmployeeProfileBodySchema, isRoleAllowedForDepartment, DEPARTMENT_ROLE_MISMATCH_MESSAGE, checkMinMonthlySalary } from "@/lib/validations/hr";
import { departments, organizations } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { createAuditLog } from "@/lib/audit-log";
import { syncEmployeeSkillsFromProfile } from "@/lib/hr/sync-employee-skills";
import { syncUserDepartmentMembership } from "@/server/queries/hr/department-membership";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  return withAuth(async (session) => {
    const { employeeId: id } = await params;
    const employee = await getEmployee(session.orgId, id);
    if (!employee) return err("Employee not found.", 404);
    return ok(employee);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  return withAuth(async (session) => {
    const { employeeId: targetUserId } = await params;

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, targetUserId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });

    if (!targetMember) {
      return err("User not found in your organization.", 403);
    }

    const isSelf = session.user.id === targetUserId;
    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);
    if (!isSelf && !isOwnerOrAdmin) {
      return err("You can only update your own profile.", 403);
    }

    const body = await parseBody(req, updateEmployeeProfileBodySchema);

    if (body.isActive === false) {
      return err(
        "Use the termination workflow to deactivate an employee (so CEO approval, full-and-final settlement, and asset returns are recorded).",
        400
      );
    }

    const adminOnlyFields = [
      "role",
      "monthlySalary",
      "hasDashboardAccess",
      "designation",
      "departmentId",
      "reportingTo",
    ] as const;
    if (!isOwnerOrAdmin) {
      const attempted = adminOnlyFields.filter((f) => body[f] !== undefined);
      if (attempted.length > 0) {
        return err(`Only admins can change: ${attempted.join(", ")}.`, 403);
      }
    }

    // Department ↔ system-role compatibility (D10). Only admins can change
    // either field, and only they reach this branch.
    if (isOwnerOrAdmin && body.departmentId !== undefined && body.departmentId == null) {
      return err("Department is required for every employee.", 400);
    }

    if (isOwnerOrAdmin && (body.role !== undefined || body.departmentId !== undefined)) {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { role: true, departmentId: true },
      });
      const effectiveRole = body.role ?? currentUser?.role ?? undefined;
      const effectiveDepartmentId = body.departmentId ?? currentUser?.departmentId ?? null;
      if (effectiveRole && effectiveDepartmentId != null) {
        const deptRow = await db.query.departments.findFirst({
          where: and(eq(departments.id, effectiveDepartmentId), eq(departments.orgId, session.orgId)),
          columns: { name: true },
        });
        if (deptRow && !isRoleAllowedForDepartment(effectiveRole, deptRow.name)) {
          return err(DEPARTMENT_ROLE_MISMATCH_MESSAGE, 400);
        }
      }
    }

    // Minimum-pay policy (D12): only admins can set salary, and only they reach
    // here for that field. Reject a new salary below the org's configured floor.
    if (isOwnerOrAdmin && body.monthlySalary !== undefined) {
      const orgRow = await db.query.organizations.findFirst({
        where: eq(organizations.id, session.orgId),
        columns: { settings: true },
      });
      const orgMinSalary = (orgRow?.settings as Record<string, unknown> | null)?.minMonthlySalary;
      const minSalaryError = checkMinMonthlySalary(
        body.monthlySalary,
        typeof orgMinSalary === "number" ? orgMinSalary : null,
      );
      if (minSalaryError) {
        return err(minSalaryError, 400);
      }
    }

    if (body.reportingTo !== undefined && body.reportingTo !== null) {
      if (body.reportingTo === targetUserId) {
        return err("An employee cannot report to themselves.", 400);
      }
      let cursor: string | null = body.reportingTo;
      const visited = new Set<string>([targetUserId]);
      while (cursor) {
        if (visited.has(cursor)) {
          return err("This reporting structure would create a circular management chain.", 400);
        }
        visited.add(cursor);
        const mgr: { reportingTo: string | null } | undefined = await db.query.users.findFirst({
          where: eq(users.id, cursor),
          columns: { reportingTo: true },
        });
        cursor = mgr?.reportingTo ?? null;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.firstName !== undefined || body.lastName !== undefined) {
      const existing = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { firstName: true, lastName: true, name: true },
      });
      const first = body.firstName ?? existing?.firstName ?? "";
      const last = body.lastName ?? existing?.lastName ?? "";
      updateData.firstName = first;
      updateData.lastName = last;
      if (!body.name) updateData.name = `${first} ${last}`.trim();
    }
    if (body.role !== undefined && isOwnerOrAdmin) updateData.role = body.role;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.experienceYears !== undefined) updateData.experienceYears = body.experienceYears;
    if (body.taxId !== undefined) updateData.taxId = body.taxId;
    if (body.monthlySalary !== undefined && isOwnerOrAdmin) updateData.monthlySalary = body.monthlySalary;
    if (body.bankDetails !== undefined) updateData.bankDetails = body.bankDetails;
    if (body.designation !== undefined && isOwnerOrAdmin) updateData.designation = body.designation;
    if (body.departmentId !== undefined && isOwnerOrAdmin) updateData.departmentId = body.departmentId;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.hasDashboardAccess !== undefined) {
      if (!isOwnerOrAdmin) return err("Only admins can toggle dashboard access.", 403);
      updateData.hasDashboardAccess = body.hasDashboardAccess;
    }
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.linkedinUrl !== undefined) updateData.linkedinUrl = body.linkedinUrl || null;
    if (body.twitterUrl !== undefined) updateData.twitterUrl = body.twitterUrl || null;
    if (body.githubUrl !== undefined) updateData.githubUrl = body.githubUrl || null;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl || null;
    if (body.joiningDate !== undefined && isOwnerOrAdmin) updateData.joiningDate = body.joiningDate;
    if (body.reportingTo !== undefined && isOwnerOrAdmin) updateData.reportingTo = body.reportingTo;

    let previousJoiningDate: Date | null = null;
    if (body.joiningDate && isOwnerOrAdmin) {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { joiningDate: true },
      });
      previousJoiningDate = currentUser?.joiningDate
        ? new Date(currentUser.joiningDate)
        : null;
    }

    await db.transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.update(users).set(updateData).where(eq(users.id, targetUserId));
      }

      // Keep department_members aligned with users.departmentId when an admin
      // reassigns the directory department (D18).
      if (body.departmentId !== undefined && isOwnerOrAdmin) {
        await syncUserDepartmentMembership(tx, targetUserId, body.departmentId);
      }

      if (body.joiningDate && isOwnerOrAdmin && previousJoiningDate) {
        const newDate = new Date(body.joiningDate);
        if (previousJoiningDate.getTime() !== newDate.getTime()) {
          const dayDiff = differenceInDays(newDate, previousJoiningDate);
          const tasks = await tx.query.onboardingTasks.findMany({
            where: and(
              eq(onboardingTasks.userId, targetUserId),
              eq(onboardingTasks.status, "PENDING")
            ),
            columns: { id: true, dueDate: true },
          });
          for (const task of tasks) {
            if (task.dueDate) {
              await tx
                .update(onboardingTasks)
                .set({ dueDate: addDays(task.dueDate, dayDiff) })
                .where(eq(onboardingTasks.id, task.id));
            }
          }
        }
      }
    });

    if (body.skills !== undefined) {
      await syncEmployeeSkillsFromProfile(session.orgId, targetUserId, body.skills);
    }

    if (body.isActive === true) {
      const activatedUser = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: { joiningDate: true },
      });
      await inngest.send({
        name: "hr/employee.onboarded",
        data: {
          userId: targetUserId,
          orgId: session.orgId,
          joiningDate: activatedUser?.joiningDate ?? new Date().toISOString().split("T")[0],
        },
      });
    }

    void createAuditLog({
      action: "hr.employee_updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: targetUserId,
      targetType: "employee",
      metadata: { changedFields: Object.keys(updateData) },
    }).catch(() => {});

    return ok({ success: true });
  });
}
