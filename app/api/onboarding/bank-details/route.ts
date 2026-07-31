import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, onboardingSteps } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const schema = z.object({
  accountHolder: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(8).max(18),
  ifsc: z.string().length(11),
  branch: z.string().optional(),
  taxId: z.string().optional(),
});

async function upsertOnboardingStep(userId: string, orgId: string, stepName: string) {
  const existing = await db.query.onboardingSteps.findFirst({
    where: and(eq(onboardingSteps.userId, userId), eq(onboardingSteps.stepName, stepName)),
  });
  if (existing) {
    await db.update(onboardingSteps)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(onboardingSteps.id, existing.id));
  } else {
    await db.insert(onboardingSteps).values({
      userId,
      orgId,
      stepName,
      status: "COMPLETED",
      completedAt: new Date(),
    });
  }
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, schema);

    await db.update(users).set({
      bankDetails: {
        accountNumber: body.accountNumber,
        bankName: body.bankName,
        branch: body.branch ?? "",
        ifsc: body.ifsc,
        accountHolder: body.accountHolder,
      },
      ...(body.taxId ? { taxId: body.taxId } : {}),
    }).where(eq(users.id, session.user.id));

    await upsertOnboardingStep(session.user.id, session.orgId, "Bank Details");

    return ok({ success: true });
  });
}
