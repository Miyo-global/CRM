import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { ONBOARDING_MUTATE_ROLES } from "@/lib/constants/roles";
import { startOnboardingForUser } from "@/lib/hr/start-onboarding";
import { db } from "@/lib/db";
import { users, organizationMembers, salaryStructures } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";
import { inngest } from "@/lib/inngest/client";
import { createAuditLog } from "@/lib/audit-log";
import { sendSetupLink } from "@/lib/hr/setup-link";
import { formatDateOnly } from "@/lib/date-utils";
import { generateNextEmployeeId, normalizeEmployeeIdInput } from "@/lib/hr/generate-employee-id";
import { onboardEmployeeInputSchema, isRoleAllowedForDepartment, DEPARTMENT_ROLE_MISMATCH_MESSAGE, checkMinMonthlySalary } from "@/lib/validations/hr";
import { syncEmployeeSkillsFromProfile } from "@/lib/hr/sync-employee-skills";
import { syncUserDepartmentMembership } from "@/server/queries/hr/department-membership";
import { departments, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { checkRoleAssignment } from "@/lib/auth/role-assignment";
import { afterResponse } from "@/lib/after-response";
import { findAccountByEmail, revokePendingInvitations } from "@/lib/org/email-identity";

export async function POST(req: NextRequest) {
  return withRoles(ONBOARDING_MUTATE_ROLES)(async (session) => {
    const body = await parseBody(req, onboardEmployeeInputSchema);

    const existing = await findAccountByEmail(body.email);
    if (existing) {
      return err("A user with this email already exists.", 409);
    }

    // Server-side department ↔ role compatibility (D10): resolve the canonical
    // department name so we do not rely solely on the client-supplied name.
    const onboardRole = body.role || "EMPLOYEE";

    // Privilege-escalation gate (QA-0002): HR cannot onboard a CEO/ADMIN, and
    // an unknown role string is rejected instead of stored.
    const roleError = await checkRoleAssignment({
      orgId: session.orgId,
      actorRole: session.user.role,
      actorId: session.user.id,
      newRole: onboardRole,
    });
    if (roleError) return err(roleError.message, roleError.status);

    // The wizard offers common departments that do not exist yet under
    // placeholder negative ids. Storing one left the profile Unassigned
    // (QA-0020), so resolve it to a real department here, creating it once.
    let departmentId = body.departmentId;
    let departmentName = body.departmentName?.trim();

    if (departmentId > 0) {
      const deptRow = await db.query.departments.findFirst({
        where: and(eq(departments.id, departmentId), eq(departments.orgId, session.orgId)),
        columns: { name: true },
      });
      if (!deptRow) return err("Select a department that exists in your organisation.", 400);
      departmentName = deptRow.name;
    } else {
      if (!departmentName) return err("Department is required.", 400);
      const existing = await db.query.departments.findFirst({
        where: and(eq(departments.orgId, session.orgId), eq(departments.name, departmentName)),
        columns: { id: true },
      });
      if (existing) {
        departmentId = existing.id;
      } else {
        const [created] = await db
          .insert(departments)
          .values({ orgId: session.orgId, name: departmentName })
          .returning({ id: departments.id });
        departmentId = created.id;
      }
    }

    // A reporting manager chosen in the wizard must be a member of this org.
    let reportingTo: string | null = body.reportingTo?.trim() || null;
    if (reportingTo) {
      const manager = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, reportingTo),
          eq(organizationMembers.orgId, session.orgId),
        ),
        columns: { id: true },
      });
      if (!manager) return err("Select a reporting manager from your organisation.", 400);
    } else {
      reportingTo = null;
    }

    if (departmentName && !isRoleAllowedForDepartment(onboardRole, departmentName)) {
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

    // The employee sets their own password through the emailed set-up link
    // below, which also verifies their address. Until then the stored hash is
    // of an unguessable random string (A15).
    const passwordHash = await hash(nanoid(48), 12);
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

    let revokedInvitations = 0;
    const newUser = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          id: userId,
          email: body.email.toLowerCase(),
          name: `${body.firstName} ${body.lastName}`,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone?.trim() || null,
          whatsappNumber: (body.whatsappSameAsPhone ? body.phone : body.whatsappNumber)?.trim() || null,
          gender: body.gender ?? null,
          password: passwordHash,
          designation: body.designation,
          departmentId,
          reportingTo: reportingTo ?? null,
          role: body.role || "EMPLOYEE",
          employeeId,
          joiningDate: formatDateOnly(body.joiningDate),
          dateOfBirth: body.dateOfBirth ? formatDateOnly(body.dateOfBirth) : null,
          skills: body.skills ? body.skills.split(",").map((s) => s.trim()) : undefined,
          experienceYears: body.experienceYears?.toString(),
          taxId: body.taxId,
          monthlySalary: body.monthlySalary?.toString(),
          bankDetails: (body.bankDetails ?? null) as typeof users.$inferInsert["bankDetails"],
          isActive: true,
          hasDashboardAccess: true,
          isPasswordChangeRequired: true,
        })
        .returning();

      await tx.insert(organizationMembers).values({
        orgId: session.orgId,
        userId: u.id,
        role: body.role || "EMPLOYEE",
      });

      // R3-ONB-07: the wizard consumes any pending invite for this address,
      // so the old "Join Organization" link cannot create a second account.
      revokedInvitations = await revokePendingInvitations(session.orgId, u.email, tx);

      // Keep the department_members join table in sync with users.departmentId
      // so the department delete-guard and headcount stay accurate (D18).
      await syncUserDepartmentMembership(tx, u.id, departmentId);

      if (body.monthlySalary && body.monthlySalary > 0) {
        const basicSalary = body.monthlySalary * 0.5;
        const specialAllowance = body.monthlySalary * 0.25;
        await tx.insert(salaryStructures).values({
          orgId: session.orgId,
          userId: u.id,
          basicSalary: basicSalary.toString(),
          hraPercentage: "50",
          // MIYO-0124: the 50/25/25 split puts the third part in
          // specialAllowance; it was landing in the generic allowances column.
          specialAllowance: specialAllowance.toString(),
          allowances: "0",
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

    afterResponse("hr/employees/onboard", () => notifyByRoles(session.orgId, [ROLES.CEO, ROLES.HR], {
      type: "SUCCESS",
      title: "New Employee Onboarded",
      message: `${body.firstName} ${body.lastName} (${body.designation}) has been onboarded${body.joiningDate ? `, joining ${formatDateOnly(body.joiningDate)}` : ""}.`,
      link: `/hr/employees/${newUser.id}`,
      metadata: { employeeId: newUser.id },
      excludeUserId: session.user.id,
    }));

    // Start the checklist straight away, so a successful hire always shows in
    // Onboarding › Progress (A21). A failure here must not fail the hire.
    try {
      await startOnboardingForUser({
        orgId: session.orgId,
        userId: newUser.id,
        joiningDate: body.joiningDate ?? null,
      });
    } catch (onboardingErr) {
      logger.error("Failed to start onboarding checklist", {
        userId: newUser.id,
        error: onboardingErr instanceof Error ? onboardingErr.message : "Unknown",
      });
    }

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
        metadata: { email: body.email, name: `${body.firstName} ${body.lastName}`, role: body.role, designation: body.designation, revokedInvitations },
      });
    } catch (auditErr) {
      logger.error("Failed to write onboard audit log", { userId: newUser.id, error: auditErr instanceof Error ? auditErr.message : "Unknown" });
    }

    if (newUser.email) {
      try {
        await sendSetupLink({
          email: newUser.email,
          name: `${body.firstName} ${body.lastName}`,
          designation: body.designation,
          joiningDate: body.joiningDate,
          reportingTo,
        });
      } catch (emailErr) {
        logger.error("Failed to send setup email", { email: newUser.email, error: emailErr instanceof Error ? emailErr.message : "Unknown" });
      }
    }

    // MIYO-0663: the ATS needs the new user id to close the application.
    return ok({ success: true, userId: newUser.id, revokedInvitations });
  }, req);
}
