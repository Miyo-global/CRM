import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z
    .string()
    .trim()
    .min(1, "Please describe the overtime work.")
    .max(5000, "Note must be at most 5000 characters."),
  proofUrl: z.string().url("Invalid URL").max(2048).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid overtime worklog.", 400);
    }
    const { localDate, note, proofUrl } = parsed.data;

    const serverToday = getTodayString();
    const date =
      localDate &&
      Math.abs(
        new Date(localDate + "T00:00:00").getTime() -
          new Date(serverToday + "T00:00:00").getTime()
      ) <=
        24 * 60 * 60 * 1000
        ? localDate
        : serverToday;

    const [log] = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, session.user.id),
          eq(attendance.orgId, session.orgId),
          eq(attendance.date, date)
        )
      )
      .orderBy(desc(attendance.createdAt))
      .limit(1);

    if (!log) return err("No attendance record found for this date.", 404);

    await db
      .update(attendance)
      .set({ overtimeNote: note, overtimeProofUrl: proofUrl || null })
      .where(eq(attendance.id, log.id));

    return ok({ success: true });
  });
}
