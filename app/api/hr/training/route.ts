import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { trainingPrograms } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  duration: z.string().max(50).optional(),
  instructor: z.string().max(100).optional(),
  maxParticipants: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().max(200).optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.trainingPrograms.findMany({
      where: eq(trainingPrograms.orgId, session.orgId),
      with: { enrollments: true },
      orderBy: [desc(trainingPrograms.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can create programs.", 403);
    const body = createSchema.parse(await req.json());
    const [program] = await db.insert(trainingPrograms).values({
      orgId: session.orgId,
      ...body,
      meetingLink: body.meetingLink || undefined,
      status: "DRAFT",
      createdBy: session.user.id,
    }).returning();
    return ok(program, 201);
  });
}
