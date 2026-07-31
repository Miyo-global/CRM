import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingSteps, organizationMembers, leaveTypes, leaveBalances, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST() {
  return withAuth(async (session) => {
    const steps = await db.query.onboardingSteps.findMany({
      where: eq(onboardingSteps.userId, session.user.id),
      columns: { stepName: true, status: true },
    });
    const statusByName = new Map(steps.map((s) => [s.stepName, s.status]));
    const requiredSteps = ["Personal Details", "Bank Details"];
    const incomplete = requiredSteps.filter((name) => statusByName.get(name) !== "COMPLETED");
    if (incomplete.length > 0) {
      return err(`Please complete all required steps before submitting: ${incomplete.join(", ")}`, 400);
    }

    const currentYear = new Date().getFullYear();

    await db.transaction(async (tx) => {
      const existing = await tx.query.onboardingSteps.findFirst({
        where: and(
          eq(onboardingSteps.userId, session.user.id),
          eq(onboardingSteps.stepName, "Final Review")
        ),
      });
      if (existing) {
        await tx.update(onboardingSteps)
          .set({ status: "COMPLETED", completedAt: new Date() })
          .where(eq(onboardingSteps.id, existing.id));
      } else {
        await tx.insert(onboardingSteps).values({
          userId: session.user.id,
          orgId: session.orgId,
          stepName: "Final Review",
          status: "COMPLETED",
          completedAt: new Date(),
        });
      }

      const existingBalance = await tx.query.leaveBalances.findFirst({
        where: and(
          eq(leaveBalances.userId, session.user.id),
          eq(leaveBalances.year, currentYear)
        ),
      });

      if (!existingBalance) {
        const orgLeaveTypes = await tx.query.leaveTypes.findMany({
          where: eq(leaveTypes.orgId, session.orgId),
        });

        if (orgLeaveTypes.length > 0) {
          await tx.insert(leaveBalances).values(
            orgLeaveTypes.map((lt) => ({
              orgId: session.orgId,
              userId: session.user.id,
              leaveTypeId: lt.id,
              balance: String(lt.daysPerYear),
              year: currentYear,
            }))
          );
        }
      }

      await tx.update(users).set({ onboardingCompleted: true }).where(eq(users.id, session.user.id));
    });

    return ok({ success: true });
  });
}
