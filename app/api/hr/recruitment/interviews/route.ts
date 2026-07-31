import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews, candidates } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createInterviewSchema = z
  .object({
    candidateId: z.number().int().positive(),
    jobPostingId: z.number().int().positive().optional(),
    interviewerId: z.string().min(1).optional(),
    type: z.enum(["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"]).optional(),
    scheduledAt: z.string().datetime(),
    duration: z.number().int().min(15, "Duration must be at least 15 minutes").max(480, "Duration cannot exceed 8 hours").optional(),
    location: z.string().trim().max(300).optional(),
    meetingLink: z.string().url("Must be a valid URL").max(500).optional().or(z.literal("")),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((d, ctx) => {
    if (new Date(d.scheduledAt) <= new Date()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interview must be scheduled in the future", path: ["scheduledAt"] });
    }
    if (d.type === "VIDEO" && !d.meetingLink?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Meeting link is required for online interviews", path: ["meetingLink"] });
    }
    if (d.type === "ONSITE" && !d.location?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Address is required for onsite interviews", path: ["location"] });
    }
  });

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const candidateId = searchParams.get("candidateId");
    const upcoming = searchParams.get("upcoming");

    const conditions = [eq(interviews.orgId, session.orgId)];
    if (candidateId) conditions.push(eq(interviews.candidateId, Number(candidateId)));
    if (upcoming === "true") conditions.push(gte(interviews.scheduledAt, new Date()));

    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 200);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const data = await db.query.interviews.findMany({
      where: and(...conditions),
      with: { candidate: true, interviewer: true },
      orderBy: [desc(interviews.scheduledAt)],
      limit,
      offset,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, createInterviewSchema);

    if (!body.candidateId || !body.scheduledAt) {
      return err("candidateId and scheduledAt are required.", 400);
    }

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found.", 404);

    const scheduledDate = new Date(body.scheduledAt);

    const conflict = await db.query.interviews.findFirst({
      where: and(
        eq(interviews.orgId, session.orgId),
        eq(interviews.candidateId, body.candidateId),
        eq(interviews.scheduledAt, scheduledDate),
      ),
      columns: { id: true },
    });
    if (conflict) {
      return err("An interview for this candidate is already scheduled at this time.", 409);
    }

    const [interview] = await db
      .insert(interviews)
      .values({
        orgId: session.orgId,
        candidateId: body.candidateId,
        jobPostingId: body.jobPostingId,
        interviewerId: body.interviewerId,
        type: (body.type as "PHONE" | "VIDEO" | "ONSITE" | "TECHNICAL" | "HR" | "FINAL") || "VIDEO",
        scheduledAt: scheduledDate,
        duration: body.duration || 60,
        location: body.location,
        meetingLink: body.meetingLink,
        notes: body.notes,
        result: "PENDING",
      })
      .returning();

    return ok(interview);
  });
}
