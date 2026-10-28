import { logger } from "../logger";
import type { EmailDeliveryStatus } from "@/lib/db/schema";

/**
 * Best-effort outbound email log (P2-no-outbound-email-delivery-audit). Every
 * function here swallows its own errors: a broken log must never stop a mail
 * from going out or turn a successful send into a failure.
 */

async function resolveOrgId(to: string[]): Promise<string | null> {
  if (to.length === 0) return null;
  const { db } = await import("@/lib/db");
  const { users, organizationMembers } = await import("@/lib/db/schema");
  const { eq, sql } = await import("drizzle-orm");
  const [row] = await db
    .select({ orgId: organizationMembers.orgId })
    .from(users)
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(sql`lower(${users.email}) = lower(${to[0]})`)
    .limit(1);
  return row?.orgId ?? null;
}

export async function recordEmailQueued(params: {
  to: string[];
  subject: string;
  orgId?: string;
  templateKey?: string;
}): Promise<number | null> {
  try {
    const { db } = await import("@/lib/db");
    const { emailDeliveries } = await import("@/lib/db/schema");
    const orgId = params.orgId ?? (await resolveOrgId(params.to));
    const [row] = await db
      .insert(emailDeliveries)
      .values({
        orgId,
        toAddress: params.to.join(", "),
        subject: params.subject.slice(0, 500),
        templateKey: params.templateKey ?? null,
        status: "queued",
      })
      .returning({ id: emailDeliveries.id });
    return row?.id ?? null;
  } catch (error) {
    logger.warn("Email delivery log insert failed", {
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

export async function recordEmailOutcome(
  id: number | null,
  outcome: { status: Exclude<EmailDeliveryStatus, "queued">; providerMessageId?: string; error?: string },
): Promise<void> {
  if (id == null) return;
  try {
    const { db } = await import("@/lib/db");
    const { emailDeliveries } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(emailDeliveries)
      .set({
        status: outcome.status,
        providerMessageId: outcome.providerMessageId ?? null,
        error: outcome.error?.slice(0, 1000) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(emailDeliveries.id, id));
  } catch (error) {
    logger.warn("Email delivery log update failed", {
      id,
      error: error instanceof Error ? error.message : error,
    });
  }
}
