"use server";

import { db } from "@/lib/db";
import { users, organizationMembers, departments, branches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendAccountDeactivationEmail } from "@/lib/email";
import { ROLES, ADMIN_ROLES, EXPENSE_ADMIN_ROLES } from "@/lib/constants/roles";

export async function getEmployees() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id)
  });
  if (!member) return [];

  const orgMembers = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, member.orgId),
    with: {
        user: {
          with: {
            department: true,
          },
        },
    }
  });
  return orgMembers.map(m => m.user);
}

export async function getEmployeeById(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const requesterOrgMember = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id)
  });

  if (!requesterOrgMember) return null;
  const rows = await db.select({
      user: users
  })
  .from(users)
  .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
  .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.orgId, requesterOrgMember.orgId)
  ))
  .limit(1);

  if (rows.length === 0) return null;

  const user = rows[0]!.user;

  const canSeeSensitive =
    session.user.id === userId || ADMIN_ROLES.includes(session.user.role ?? "");

  const [dept, branch, manager] = await Promise.all([
    user.departmentId
      ? db.query.departments.findFirst({
          where: eq(departments.id, user.departmentId),
          columns: { name: true },
        })
      : null,
    user.branchId
      ? db.query.branches.findFirst({
          where: eq(branches.id, user.branchId),
          columns: { name: true, city: true },
        })
      : null,
    user.reportingTo
      ? db.query.users.findFirst({
          where: eq(users.id, user.reportingTo),
          columns: { name: true, firstName: true, lastName: true, designation: true },
        })
      : null,
  ]);

  const managerName = manager
    ? manager.name ?? (`${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() || null)
    : null;

  const INTERNAL_FIELDS = [
    "password",
    "totpSecret",
    "totpEnabled",
    "googleRefreshToken",
    "googleEmail",
    "loginAttempts",
    "lockedUntil",
    "passwordChangedAt",
    "isPasswordChangeRequired",
    "metadata",
    "emailVerified",
  ];
  const SENSITIVE_FIELDS = ["monthlySalary", "taxId", "bankDetails", "dateOfBirth", "emergencyContact"];

  const result: Record<string, unknown> = { ...user };
  for (const k of INTERNAL_FIELDS) delete result[k];
  if (!canSeeSensitive) for (const k of SENSITIVE_FIELDS) result[k] = null;

  result.departmentName = dept?.name ?? null;
  result.branchName = branch?.name ?? null;
  result.branchCity = branch?.city ?? null;
  result.managerName = managerName;
  result.managerDesignation = manager?.designation ?? null;
  result.viewerCanSeeSensitive = canSeeSensitive;

  return result as unknown as typeof user & {
    departmentName: string | null;
    branchName: string | null;
    branchCity: string | null;
    managerName: string | null;
    managerDesignation: string | null;
    viewerCanSeeSensitive: boolean;
  };
}

export async function updateEmployee(data: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    designation?: string;
    departmentId?: number;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    joiningDate?: Date;
    skills?: string[];
    experienceYears?: number;
    taxId?: string;
    monthlySalary?: number;
    bankDetails?: {
        accountNumber: string;
        bankName: string;
        branch: string;
        ifsc: string;
        accountHolder: string;
    };
}) {
    const session = await auth();
    if (!session?.user?.id || !EXPENSE_ADMIN_ROLES.includes(session.user.role ?? "")) {
        return { error: "Unauthorized" };
    }

    try {
        const requesterOrgMember = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, session.user.id)
        });

        if (!requesterOrgMember) return { error: "Organization context not found" };

        const targetOrgMember = await db.query.organizationMembers.findFirst({
            where: and(
                eq(organizationMembers.userId, data.id),
                eq(organizationMembers.orgId, requesterOrgMember.orgId)
            )
        });

        if (!targetOrgMember) return { error: "Employee not found in your organization" };

        await db.update(users)
            .set({
                firstName: data.firstName,
                lastName: data.lastName,
                name: `${data.firstName} ${data.lastName}`,
                role: data.role,
                designation: data.designation,
                departmentId: data.departmentId,
                phone: data.phone,
                gender: data.gender,
                joiningDate: data.joiningDate ? data.joiningDate.toISOString().split('T')[0] : undefined,
                skills: data.skills,
                experienceYears: data.experienceYears ? String(data.experienceYears) : undefined,
                taxId: data.taxId,
                monthlySalary: data.monthlySalary !== undefined ? String(data.monthlySalary) : undefined,
                bankDetails: data.bankDetails,
            })
            .where(eq(users.id, data.id));

        if (requesterOrgMember) {
             await db.update(organizationMembers)
                .set({ role: data.role })
                .where(and(
                    eq(organizationMembers.userId, data.id),
                    eq(organizationMembers.orgId, requesterOrgMember.orgId)
                ));
        }

        revalidatePath("/hr/employees");
        revalidatePath(`/hr/employees/${data.id}`);
        return { success: true };
    } catch (e) {
        return { error: "Failed to update employee" };
    }
}

export async function toggleDashboardAccess(userId: string, hasDashboardAccess: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const { role, id: currentUserId } = session.user;
  if (!EXPENSE_ADMIN_ROLES.includes(role ?? "")) {
    return { error: "Permission denied" };
  }
  if (userId === currentUserId) {
    return { error: "You cannot toggle your own dashboard access" };
  }

  try {
    const requesterOrgMember = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!requesterOrgMember) return { error: "Organization context not found" };

    const targetOrgMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.orgId, requesterOrgMember.orgId)
      ),
    });
    if (!targetOrgMember) return { error: "Employee not found in your organization" };

    const employee = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!employee) return { error: "User not found" };
    if (employee.role === ROLES.CEO) return { error: "Cannot modify dashboard access for the CEO" };

    await db.update(users)
      .set({ hasDashboardAccess })
      .where(eq(users.id, userId));

    revalidatePath("/hr");
    return { success: true };
  } catch {
    return { error: "Failed to toggle dashboard access" };
  }
}

export async function deleteEmployee(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const { role, id: currentUserId } = session.user;
  if (role !== ROLES.CEO && role !== ROLES.ADMIN) {
      return { error: "Permission denied" };
  }
  if (userId === currentUserId) {
      return { error: "You cannot delete your own account" };
  }

  try {
      const requesterOrgMember = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id),
      });
      if (!requesterOrgMember) return { error: "Organization context not found" };

      const targetOrgMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.orgId, requesterOrgMember.orgId)
        ),
      });
      if (!targetOrgMember) return { error: "Employee not found in your organization" };

      const employee = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!employee) {
        return { error: "User not found" };
      }
      if (role === ROLES.ADMIN && (employee.role === ROLES.ADMIN || employee.role === ROLES.CEO)) {
        return { error: "Admins can only delete Member accounts" };
      }
      if (role === ROLES.CEO && employee.role === ROLES.CEO) {
        return { error: "Cannot delete another Owner account" };
      }
      await db.update(users)
        .set({ isActive: false })
        .where(eq(users.id, userId));
      if (employee?.email) {
        await sendAccountDeactivationEmail(
          employee.email,
          employee.name || "Employee",
          session.user.name || "Administrator"
        );
      }

      revalidatePath("/hr/employees");
      return { success: true };
  } catch (error) {
      return { error: "Failed to delete employee" };
  }
}
