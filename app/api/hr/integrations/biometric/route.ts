import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

const biometricSchema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  timestamp: z.string().min(1),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
  deviceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const expectedKey = process.env.BIOMETRIC_API_KEY;
  if (!expectedKey) return err("Biometric integration not configured.", 503);

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return err("Invalid API key.", 401);

  let keyValid = false;
  try {
    const a = Buffer.from(apiKey);
    const b = Buffer.from(expectedKey);
    keyValid = a.length === b.length && timingSafeEqual(a, b);
  } catch {
    keyValid = false;
  }
  if (!keyValid) return err("Invalid API key.", 401);

  const body = biometricSchema.parse(await req.json());

  const allowedOrgId = process.env.BIOMETRIC_ORG_ID;
  if (allowedOrgId) {
    if (body.orgId !== allowedOrgId) {
      logger.warn("biometric: org mismatch — caller-supplied orgId does not match BIOMETRIC_ORG_ID", {
        suppliedOrgId: body.orgId,
        employeeId: body.employeeId,
        deviceId: body.deviceId,
      });
      return err("Forbidden: biometric API key is not authorized for this org.", 403);
    }
  } else {
    logger.warn("biometric: orgId is caller-supplied and no BIOMETRIC_ORG_ID is set — set BIOMETRIC_ORG_ID to lock the API key to a single org until a device-registration table exists", {
      orgId: body.orgId,
      employeeId: body.employeeId,
      deviceId: body.deviceId,
      type: body.type,
    });
  }

  const row = await db
    .select({ userId: users.id })
    .from(users)
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.userId, users.id),
        eq(organizationMembers.orgId, body.orgId)
      )
    )
    .where(eq(users.employeeId, body.employeeId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) return err(`Employee not found: ${body.employeeId}`, 404);

  const { userId } = row;
  const timestamp = new Date(body.timestamp);
  const dateStr = timestamp.toISOString().split("T")[0];

  if (body.type === "CHECK_IN") {
    const [log] = await db.insert(attendance).values({
      orgId: body.orgId,
      userId,
      date: dateStr,
      checkIn: timestamp,
      status: "PRESENT",
    }).returning();
    return ok({ logged: true, type: "CHECK_IN", logId: log.id });
  }

  const existingLog = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.date, dateStr),
      eq(attendance.orgId, body.orgId)
    ),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  if (!existingLog) {
    return err("No check-in found for today.", 400);
  }

  const checkInTime = existingLog.checkIn ? new Date(existingLog.checkIn) : timestamp;
  const workHours = (timestamp.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

  await db.update(attendance).set({
    checkOut: timestamp,
    workHours: workHours.toFixed(2),
    status: "CHECKED_OUT",
  }).where(eq(attendance.id, existingLog.id));

  return ok({ logged: true, type: "CHECK_OUT", workHours: workHours.toFixed(2) });
}
