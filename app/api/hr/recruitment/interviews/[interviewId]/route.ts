import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";

const INTERVIEW_TYPES = ["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"] as const;
const INTERVIEW_RESULTS = ["PENDING", "PASSED", "FAILED", "NO_SHOW"] as const;

const updateInterviewSchema = z.object({
  type: z.enum(INTERVIEW_TYPES).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  result: z.enum(INTERVIEW_RESULTS).optional(),
  feedback: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  rubric: z
    .array(
      z.object({
        category: z.string(),
        score: z.number(),
        maxScore: z.number(),
        comment: z.string().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  recordingUrl: z.string().url().optional().or(z.literal("")).or(z.null()),
  recordingPlatform: z.string().max(50).optional().or(z.null()),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: id } = await params;
    const interviewId = Number(id);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const existing = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!existing) return err("Interview not found.", 404);

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";
    const isAssignedInterviewer =
      existing.interviewerId === session.user.id ||
      (existing.panelInterviewerIds ?? []).includes(session.user.id);
    if (!isAdmin && !isAssignedInterviewer) {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, updateInterviewSchema);

    await db
      .update(interviews)
      .set({
        ...(body.type !== undefined && { type: body.type }),
        ...(body.scheduledAt !== undefined && { scheduledAt: new Date(body.scheduledAt) }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.meetingLink !== undefined && { meetingLink: body.meetingLink || null }),
        ...(body.result !== undefined && { result: body.result }),
        ...(body.feedback !== undefined && { feedback: body.feedback }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.rubric !== undefined && { rubric: body.rubric }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.recordingUrl !== undefined && { recordingUrl: body.recordingUrl || null }),
        ...(body.recordingPlatform !== undefined && { recordingPlatform: body.recordingPlatform || null }),
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, interviewId));

    if (body.result === "NO_SHOW" && existing.result !== "NO_SHOW") {
      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, existing.candidateId),
        columns: { firstName: true, lastName: true },
      });
      void inngest.send({
        name: "hr/interview.no_show",
        data: {
          interviewId,
          candidateId: existing.candidateId,
          orgId: session.orgId,
          candidateName: candidate
            ? `${candidate.firstName} ${candidate.lastName}`.trim()
            : `Candidate #${existing.candidateId}`,
        },
      }).catch(() => undefined);
    }

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: id } = await params;
    const interviewId = Number(id);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const deleted = await db
      .delete(interviews)
      .where(and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)))
      .returning({ id: interviews.id });

    if (deleted.length === 0) return err("Interview not found.", 404);

    return ok({ success: true });
  });
}
