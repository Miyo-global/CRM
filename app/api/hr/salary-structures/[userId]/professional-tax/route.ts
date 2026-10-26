import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { salaryStructures, organizationMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { updateProfessionalTaxSchema } from "@/lib/validations/professional-tax";
import {
  auditProfessionalTax,
  professionalTaxColumn,
  professionalTaxEditError,
} from "@/lib/hr/professional-tax";
import { canEditOwnProfessionalTax } from "@/lib/constants/roles";

type Params = { params: Promise<{ userId: string }> };

async function loadTarget(orgId: string, userId: string) {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId)),
    columns: { id: true },
  });
  if (!membership) return null;
  const structure = await db.query.salaryStructures.findFirst({
    where: and(
      eq(salaryStructures.userId, userId),
      eq(salaryStructures.orgId, orgId),
      eq(salaryStructures.isActive, true),
    ),
    columns: { id: true, professionalTax: true },
  });
  return { structure: structure ?? null };
}

/**
 * One employee's monthly PT for the profile editor. hr:payroll:pt:view is
 * enforced by withAuth (ROUTE_PERMISSIONS); employees see their own PT only on
 * their payslip, never here.
 */
export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { userId } = await params;
    const target = await loadTarget(session.orgId, userId);
    if (!target) return err("Employee not found.", 404);

    const editError = await professionalTaxEditError({
      orgId: session.orgId,
      actorId: session.user.id,
      actorRole: session.user.role,
      targetUserId: userId,
    });

    return ok({
      userId,
      professionalTax: target.structure?.professionalTax ?? null,
      hasSalaryStructure: target.structure != null,
      canEdit: editError == null,
    });
  }, req);
}

/**
 * Set or clear (null = not applicable) the PT on the active salary structure.
 * Saved payslips keep their own snapshot (payrolls.pt_amount), so this only
 * changes runs generated from now on.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { userId } = await params;

    const editError = await professionalTaxEditError({
      orgId: session.orgId,
      actorId: session.user.id,
      actorRole: session.user.role,
      targetUserId: userId,
    });
    if (editError) return err(editError.message, editError.status);

    const body = await parseBody(req, updateProfessionalTaxSchema);

    const target = await loadTarget(session.orgId, userId);
    if (!target) return err("Employee not found.", 404);
    if (!target.structure) {
      return err("Add a salary structure for this employee before setting professional tax.", 409);
    }

    const previous = target.structure.professionalTax;
    const next = body.professionalTax;

    await db
      .update(salaryStructures)
      .set({ professionalTax: professionalTaxColumn(next), updatedAt: new Date() })
      .where(and(eq(salaryStructures.id, target.structure.id), eq(salaryStructures.orgId, session.orgId)));

    const employee = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true },
    });
    await auditProfessionalTax({
      orgId: session.orgId,
      actorId: session.user.id,
      actorRole: session.user.role,
      employeeId: userId,
      employeeName: employee?.name ?? null,
      oldValue: previous,
      newValue: next,
    });

    return ok({
      userId,
      professionalTax: professionalTaxColumn(next),
      hasSalaryStructure: true,
      canEdit: session.user.id !== userId || canEditOwnProfessionalTax(session.user.role),
    });
  }, req);
}
