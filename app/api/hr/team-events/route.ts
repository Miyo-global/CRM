import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { teamEvents, teamEventParticipants } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["TEAM_BUILDING", "OFFSITE", "CELEBRATION", "WORKSHOP", "SPORTS", "OTHER"]).optional().default("TEAM_BUILDING"),
  date: z.string().min(1),
  time: z.string().optional(),
  location: z.string().max(200).optional(),
  maxParticipants: z.number().int().positive().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.teamEvents.findMany({
      where: eq(teamEvents.orgId, session.orgId),
      with: { participants: true, organizer: true },
      orderBy: [desc(teamEvents.date)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can create events.", 403);
    const body = createSchema.parse(await req.json());
    const [event] = await db.insert(teamEvents).values({
      orgId: session.orgId,
      ...body,
      organizedBy: session.user.id,
    }).returning();
    return ok(event, 201);
  });
}
