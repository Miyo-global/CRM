import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingTasks } from "@/lib/db/schema";

/** Default checklist item that the system ticks when the hire sets their first password. */
export const ACCOUNT_ACTIVATION_TASK_TITLE = "Portal Account Activation";

/**
 * P2-onboarding-checklist-stuck-0-of-7: checklist items (default or from an
 * org template) that are about the hire's own account — activation, password,
 * first sign-in. Matched on the title only; everything else stays manual.
 */
export function isAccountActivationTask(title: string): boolean {
  return /\b(portal (account|access|activation)|account activation|activate (your |their )?account|(set|setup|set up|create) (a |your |their )?password|first (log ?in|sign[- ]?in))\b/i.test(title);
}

/**
 * Marks the user's pending account-activation items COMPLETED, by the user
 * themselves. Returns how many were ticked. Callers treat it as best-effort.
 */
export async function completeAccountActivationTasks(userId: string): Promise<number> {
  const pending = await db
    .select({ id: onboardingTasks.id, title: onboardingTasks.title })
    .from(onboardingTasks)
    .where(and(eq(onboardingTasks.userId, userId), eq(onboardingTasks.status, "PENDING")));
  const ids = pending.filter((t) => isAccountActivationTask(t.title)).map((t) => t.id);
  if (ids.length === 0) return 0;
  await db
    .update(onboardingTasks)
    .set({ status: "COMPLETED", completedAt: new Date(), completedBy: userId })
    .where(and(inArray(onboardingTasks.id, ids), eq(onboardingTasks.status, "PENDING")));
  return ids.length;
}
