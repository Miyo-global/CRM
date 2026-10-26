import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { sendWelcomeEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { formatCalendarDate, formatDateOnly, formatIST } from "@/lib/date-utils";
import { hashToken } from "@/lib/secret-crypto";

const SETUP_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Issue a fresh single-use set-up link and email it. Any earlier link for the
 * address is deleted first, so only the newest one works (R2-LC-06). Used at
 * onboarding and by "Resend set-up link" on the profile.
 */
export async function sendSetupLink(employee: {
  email: string;
  name: string;
  firstName?: string | null;
  employeeId?: string | null;
  designation?: string | null;
  joiningDate?: Date | string | null;
  reportingTo?: string | null;
}): Promise<{ expiresAt: Date }> {
  const setupToken = nanoid(48);
  const expiresAt = new Date(Date.now() + SETUP_LINK_TTL_MS);
  await db.transaction(async (tx) => {
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.email, employee.email));
    await tx.insert(passwordResetTokens).values({
      id: randomUUID(),
      email: employee.email,
      token: hashToken(setupToken),
      expiresAt,
    });
  });

  // The set-up mail states the real expiry, the first day and the
  // manager (QA-0041).
  const manager = employee.reportingTo
    ? await db.query.users.findFirst({
        where: eq(users.id, employee.reportingTo),
        columns: { name: true },
      })
    : null;

  await sendWelcomeEmail(employee.email, employee.name, `${appUrl}/setup-password?token=${setupToken}`, {
    firstName: employee.firstName,
    employeeId: employee.employeeId,
    designation: employee.designation ?? undefined,
    joiningDate: employee.joiningDate ? formatCalendarDate(formatDateOnly(employee.joiningDate)) : undefined,
    managerName: manager?.name ?? null,
    // The template already says "IST" after the time (FR1-023).
    linkExpiresAt: formatIST(expiresAt),
  });

  return { expiresAt };
}
