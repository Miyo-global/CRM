import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, salaryStructures, passwordResetTokens } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";
import { inngest } from "@/lib/inngest/client";
import { createAuditLog } from "@/lib/audit-log";
import { sendWelcomeEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { hashToken } from "@/lib/secret-crypto";
import { generateNextEmployeeId, normalizeEmployeeIdInput } from "@/lib/hr/generate-employee-id";
import { onboardEmployeeInputSchema, isRoleAllowedForDepartment, DEPARTMENT_ROLE_MISMATCH_MESSAGE, checkMinMonthlySalary } from "@/lib/validations/hr";
import { syncEmployeeSkillsFromProfile } from "@/lib/hr/sync-employee-skills";
import { syncUserDepartmentMembership } from "@/server/queries/hr/department-membership";
import { departments, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, onboardEmployeeInputSchema);

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, body.email.toLowerCase()),
    });
    if (existing) {
      return err("A user with this email already exists.", 409);
    }

    // Server-side department ↔ role compatibility (D10): resolve the canonical
    // department name so we do not rely solely on the client-supplied name.
    const onboardRole = body.role || "ENGINEERING";
    const deptRow = await db.query.departments.findFirst({
      where: and(eq(departments.id, body.departmentId), eq(departments.orgId, session.orgId)),
      columns: { name: true },
    });
    if (deptRow && !isRoleAllowedForDepartment(onboardRole, deptRow.name)) {
      return err(DEPARTMENT_ROLE_MISMATCH_MESSAGE, 400);
    }

    // Minimum-pay policy (D12): reject salaries below the org's configured floor.
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

    const passwordHash = await hash(body.password || "Welcome@123", 12);
    const userId = randomUUID();

    let employeeId = normalizeEmployeeIdInput(body.employeeId);
    if (!employeeId) {
      employeeId = await generateNextEmployeeId(body.joiningDate ?? new Date());
    } else {
      const existingId = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.employeeId, employeeId!),
        columns: { id: true },
      });
      if (existingId) {
        return err("This employee ID is already in use.", 409);
      }
    }

    const newUser = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          id: userId,
          email: body.email.toLowerCase(),
          name: `${body.firstName} ${body.lastName}`,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          whatsappNumber: body.whatsappSameAsPhone ? body.phone : body.whatsappNumber,
          gender: body.gender,
          password: passwordHash,
          designation: body.designation,
          departmentId: body.departmentId,
          role: body.role || "ENGINEERING",
          employeeId,
          joiningDate: formatDateOnly(body.joiningDate),
          dateOfBirth: formatDateOnly(body.dateOfBirth),
          skills: body.skills ? body.skills.split(",").map((s) => s.trim()) : undefined,
          experienceYears: body.experienceYears?.toString(),
          taxId: body.taxId,
          monthlySalary: body.monthlySalary?.toString(),
          bankDetails: body.bankDetails as typeof users.$inferInsert["bankDetails"],
          isActive: true,
          hasDashboardAccess: true,
          isPasswordChangeRequired: true,
        })
        .returning();

      await tx.insert(organizationMembers).values({
        orgId: session.orgId,
        userId: u.id,
        role: body.role || "ENGINEERING",
      });

      // Keep the department_members join table in sync with users.departmentId
      // so the department delete-guard and headcount stay accurate (D18).
      await syncUserDepartmentMembership(tx, u.id, body.departmentId);

      if (body.monthlySalary && body.monthlySalary > 0) {
        const basicSalary = body.monthlySalary * 0.5;
        const specialAllowance = body.monthlySalary * 0.25;
        await tx.insert(salaryStructures).values({
          orgId: session.orgId,
          userId: u.id,
          basicSalary: basicSalary.toString(),
          hraPercentage: "50",
          allowances: specialAllowance.toString(),
          deductions: "0",
          effectiveFrom: formatDateOnly(body.joiningDate),
          isActive: true,
        });
      }

      return u;
    });

    if (body.skills) {
      await syncEmployeeSkillsFromProfile(session.orgId, newUser.id, body.skills);
    }

    await invalidateHrDashboardCache(session.orgId);

    void notifyByRoles(session.orgId, [ROLES.CEO, ROLES.HR], {
      type: "SUCCESS",
      title: "New Employee Onboarded",
      message: `${body.firstName} ${body.lastName} (${body.designation}) has been onboarded${body.joiningDate ? `, joining ${formatDateOnly(body.joiningDate)}` : ""}.`,
      link: `/hr/employees/${newUser.id}`,
      metadata: { employeeId: newUser.id },
      excludeUserId: session.user.id,
    }).catch(() => {});

    void inngest.send({
      name: "hr/employee.onboarded",
      data: {
        userId: newUser.id,
        orgId: session.orgId,
        joiningDate: body.joiningDate ?? null,
      },
    }).catch(() => {
    });

    void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
      dispatchWebhook(session.orgId, "employee.hired", {
        userId: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        joiningDate: body.joiningDate ?? null,
      })
    );

    try {
      await createAuditLog({
        action: "hr.employee_onboarded",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: newUser.id,
        targetType: "employee",
        metadata: { email: body.email, name: `${body.firstName} ${body.lastName}`, role: body.role, designation: body.designation },
      });
    } catch (auditErr) {
      logger.error("Failed to write onboard audit log", { userId: newUser.id, error: auditErr instanceof Error ? auditErr.message : "Unknown" });
    }

    if (newUser.email) {
      try {
        const setupToken = nanoid(48);
        await db.insert(passwordResetTokens).values({
          id: randomUUID(),
          email: newUser.email,
          token: hashToken(setupToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const setupUrl = `${appUrl}/setup-password?token=${setupToken}`;
        await sendWelcomeEmail(newUser.email, `${body.firstName} ${body.lastName}`, setupUrl);
      } catch (emailErr) {
        logger.error("Failed to send setup email", { email: newUser.email, error: emailErr instanceof Error ? emailErr.message : "Unknown" });
      }
    }

    return ok({ success: true });
  });
}
