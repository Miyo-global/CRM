import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { salaryStructures, salaryRevisionHistory, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { snapSalaryEffectiveFrom, dayBeforeIsoDate } from "@/lib/hr/salary-effective-dates";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";

const reviseSchema = z.object({
  basicSalary: z.number().positive(),
  hraPercentage: z.number().min(0).max(100).default(50),
  specialAllowance: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(200),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can revise salaries.", 403);
    }

    const { userId } = await params;
    const body = await parseBody(req, reviseSchema);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);

    const effectiveFromSnapped = snapSalaryEffectiveFrom(body.effectiveFrom);

    const existing = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.userId, userId),
        eq(salaryStructures.orgId, session.orgId),
        eq(salaryStructures.isActive, true)
      ),
    });

    const [newStructure] = await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(salaryStructures)
          .set({
            isActive: false,
            effectiveTo: dayBeforeIsoDate(effectiveFromSnapped),
          })
          .where(eq(salaryStructures.id, existing.id));
      }

      const [s] = await tx
        .insert(salaryStructures)
        .values({
          orgId: session.orgId,
          userId,
          basicSalary: body.basicSalary.toString(),
          hraPercentage: body.hraPercentage.toString(),
          specialAllowance: body.specialAllowance.toString(),
          allowances: "0",
          deductions: body.deductions.toString(),
          professionalTax: body.professionalTax.toString(),
          effectiveFrom: effectiveFromSnapped,
          isActive: true,
          createdBy: session.user.id,
        })
        .returning();

      await tx.insert(salaryRevisionHistory).values({
        orgId: session.orgId,
        userId,
        salaryStructureId: s.id,
        previousBasic: existing?.basicSalary ?? null,
        previousHraPct: existing?.hraPercentage ?? null,
        previousSpecialAllowance: existing?.specialAllowance ?? null,
        previousPt: existing?.professionalTax ?? null,
        newBasic: body.basicSalary.toString(),
        newHraPct: body.hraPercentage.toString(),
        newSpecialAllowance: body.specialAllowance.toString(),
        newPt: body.professionalTax.toString(),
        effectiveFrom: effectiveFromSnapped,
        reason: body.reason ?? null,
        changedBy: session.user.id,
      });

      return [s];
    });

    void createAuditLog({
      action: "hr.salary_revised",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: userId,
      targetType: "salary_structure",
      metadata: { newBasic: body.basicSalary, effectiveFrom: effectiveFromSnapped, reason: body.reason },
    }).catch(() => {});

    return ok(newStructure);
  });
}
