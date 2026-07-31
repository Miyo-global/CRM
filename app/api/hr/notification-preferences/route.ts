import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.user.id),
    });

    if (!prefs) {
      return ok({
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        quietHoursStart: null as string | null,
        quietHoursEnd: null as string | null,
        categories: {} as Record<string, boolean>,
      });
    }

    return ok({
      emailEnabled: prefs.emailEnabled ?? true,
      pushEnabled: prefs.pushEnabled ?? true,
      smsEnabled: prefs.smsEnabled ?? false,
      inAppEnabled: prefs.inAppEnabled ?? true,
      quietHoursStart: prefs.quietHoursStart ?? null,
      quietHoursEnd: prefs.quietHoursEnd ?? null,
      categories: (prefs.categories as Record<string, boolean>) ?? {},
    });
  });
}

const updateSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
  categories: z.record(z.string(), z.boolean()).optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const raw = await req.json() as unknown;
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) return err("Invalid input", 400);

    const data = parsed.data;

    const existing = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.user.id),
    });

    if (existing) {
      await db
        .update(notificationPreferences)
        .set({
          emailEnabled: data.emailEnabled,
          pushEnabled: data.pushEnabled,
          smsEnabled: data.smsEnabled,
          inAppEnabled: data.inAppEnabled,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          categories: data.categories as Record<string, boolean>,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, session.user.id));
    } else {
      await db.insert(notificationPreferences).values({
        userId: session.user.id,
        orgId: session.orgId,
        emailEnabled: data.emailEnabled,
        pushEnabled: data.pushEnabled,
        smsEnabled: data.smsEnabled,
        inAppEnabled: data.inAppEnabled,
        quietHoursStart: data.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd,
        categories: data.categories as Record<string, boolean>,
      });
    }

    return ok({ success: true });
  });
}
