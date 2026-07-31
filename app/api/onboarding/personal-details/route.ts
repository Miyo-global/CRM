import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, onboardingSteps, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { formatDateOnly } from "@/lib/date-utils";
import { dateOnlySchema } from "@/lib/validations/date";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";

const schema = z.object({
  phone: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: dateOnlySchema
    .refine((v) => {
      const d = new Date(v + "T00:00:00.000Z");
      if (Number.isNaN(d.getTime())) return false;
      const now = new Date();
      const year = d.getUTCFullYear();
      return d.getTime() <= now.getTime() && year >= 1900;
    }, "Date of birth is invalid or in the future")
    .optional(),
  experienceYears: z.string().optional(),
  skills: z.array(z.string()).or(z.string()).optional(),
});

async function upsertOnboardingStep(
  userId: string,
  orgId: string,
  stepName: string
) {
  const existing = await db.query.onboardingSteps.findFirst({
    where: and(eq(onboardingSteps.userId, userId), eq(onboardingSteps.stepName, stepName)),
  });
  if (existing) {
    await db
      .update(onboardingSteps)
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
    const skillsArray = Array.isArray(body.skills)
      ? body.skills
      : body.skills
      ? (body.skills as string).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    await db.update(users).set({
      phone: body.phone,
      ...(body.gender ? { gender: body.gender } : {}),
      ...(body.dateOfBirth
        ? { dateOfBirth: formatDateOnly(new Date(body.dateOfBirth)) }
        : {}),
      ...(body.experienceYears ? { experienceYears: body.experienceYears } : {}),
      ...(skillsArray ? { skills: skillsArray } : {}),
    }).where(eq(users.id, session.user.id));

    await upsertOnboardingStep(session.user.id, session.orgId, "Personal Details");

    if (body.dateOfBirth) {
      await invalidateHrDashboardCache(session.orgId);
    }

    return ok({ success: true });
  });
}
