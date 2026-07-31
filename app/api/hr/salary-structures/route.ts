import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSalaryStructures } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { salaryStructures, salaryRevisionHistory, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import { snapSalaryEffectiveFrom, dayBeforeIsoDate } from "@/lib/hr/salary-effective-dates";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";

const createSalaryStructureSchema = z
  .object({
    userId: z.string(),
    basicSalary: z.number().positive(),
    hraPercentage: z.number().default(50),
    specialAllowance: z.number().min(0).default(0),
    allowances: z.number().min(0).default(0),
    deductions: z.number().min(0).default(0),
    professionalTax: z.number().default(200),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    reason: z.string().optional(),
  })
  .refine(
    (v) => !v.effectiveTo || v.effectiveTo >= v.effectiveFrom,
    { message: "effectiveTo must not be before effectiveFrom", path: ["effectiveTo"] }
  );

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? undefined;
    const isAdmin = isAdminOrOwner(session.user.role);

    if (userId && userId !== session.user.id && !isAdmin) {
      return err("Not authorized.", 403);
    }

    const data = await getSalaryStructures(
      session.orgId,
      userId,
      session.user.id,
      isAdmin
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can manage salary structures.", 403);
    }

    const body = await parseBody(req, createSalaryStructureSchema);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);

    const effectiveFromSnapped = snapSalaryEffectiveFrom(body.effectiveFrom);

    const existing = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.userId, body.userId),
        eq(salaryStructures.orgId, session.orgId),
        eq(salaryStructures.isActive, true)
      ),
    });

    const [structure] = await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(salaryStructures)
          .set({
            isActive: false,
            effectiveTo: dayBeforeIsoDate(effectiveFromSnapped),
          })
          .where(eq(salaryStructures.id, existing.id));
      }

      const [newStructure] = await tx
        .insert(salaryStructures)
        .values({
          orgId: session.orgId,
          userId: body.userId,
          basicSalary: body.basicSalary.toString(),
          hraPercentage: (body.hraPercentage ?? 50).toString(),
          specialAllowance: (body.specialAllowance ?? 0).toString(),
          allowances: (body.allowances ?? 0).toString(),
          deductions: (body.deductions ?? 0).toString(),
          professionalTax: (body.professionalTax ?? 200).toString(),
          effectiveFrom: effectiveFromSnapped,
          effectiveTo: body.effectiveTo ? formatDateOnly(new Date(body.effectiveTo)) : undefined,
          isActive: true,
          createdBy: session.user.id,
        })
        .returning();

      await tx.insert(salaryRevisionHistory).values({
        orgId: session.orgId,
        userId: body.userId,
        salaryStructureId: newStructure.id,
        previousBasic: existing?.basicSalary ?? null,
        previousHraPct: existing?.hraPercentage ?? null,
        previousSpecialAllowance: existing?.specialAllowance ?? null,
        previousPt: existing?.professionalTax ?? null,
        newBasic: body.basicSalary.toString(),
        newHraPct: (body.hraPercentage ?? 50).toString(),
        newSpecialAllowance: (body.specialAllowance ?? 0).toString(),
        newPt: (body.professionalTax ?? 200).toString(),
        effectiveFrom: effectiveFromSnapped,
        reason: body.reason ?? null,
        changedBy: session.user.id,
      });

      return [newStructure];
    });

    void createAuditLog({
      action: "hr.salary_changed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: body.userId,
      targetType: "salary_structure",
      metadata: { basicSalary: body.basicSalary, effectiveFrom: effectiveFromSnapped },
    }).catch(() => {});

    return ok(structure);
  });
}
