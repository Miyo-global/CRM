import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateSlaTracking } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const SLA_STATUSES = ["ON_TRACK", "AT_RISK", "BREACHED"] as const;

const slaResetSchema = z.object({
  stage: z.string().min(1),
  status: z.enum(SLA_STATUSES).optional().default("ON_TRACK"),
});


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: rawId } = await params;
    const candidateId = Number(rawId);
    if (!candidateId || isNaN(candidateId)) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found.", 404);

    const body = await parseBody(req, slaResetSchema);

    const [record] = await db
      .insert(candidateSlaTracking)
      .values({
        orgId: session.orgId,
        candidateId,
        stage: body.stage,
        enteredAt: new Date(),
        breachedAt: null,
        status: body.status,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [candidateSlaTracking.candidateId, candidateSlaTracking.stage],
        set: {
          enteredAt: new Date(),
          breachedAt: null,
          status: body.status,
          updatedAt: new Date(),
        },
      })
      .returning();

    return ok(record);
  });
}


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: rawId } = await params;
    const candidateId = Number(rawId);
    if (!candidateId || isNaN(candidateId)) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found.", 404);

    const records = await db.query.candidateSlaTracking.findMany({
      where: and(
        eq(candidateSlaTracking.candidateId, candidateId),
        eq(candidateSlaTracking.orgId, session.orgId)
      ),
      orderBy: (t, { asc }) => [asc(t.stage)],
    });

    return ok(records);
  });
}
