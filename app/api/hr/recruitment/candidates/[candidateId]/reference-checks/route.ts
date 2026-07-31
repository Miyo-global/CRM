import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateReferenceChecks, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  referenceName: z.string().min(1).max(200),
  referenceDesignation: z.string().max(200).optional(),
  referenceCompany: z.string().max(200).optional(),
  referenceEmail: z.string().email().optional(),
  referencePhone: z.string().max(30).optional(),
  relationship: z.string().max(100).optional(),
  notes: z.string().optional(),
});

type RouteParams = { params: Promise<{ candidateId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found", 404);

    const checks = await db.query.candidateReferenceChecks.findMany({
      where: and(
        eq(candidateReferenceChecks.candidateId, candidateId),
        eq(candidateReferenceChecks.orgId, session.orgId)
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    return ok(checks);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found", 404);

    const input = await parseBody(req, createSchema);

    const [created] = await db
      .insert(candidateReferenceChecks)
      .values({
        candidateId,
        orgId: session.orgId,
        referenceName: input.referenceName,
        referenceDesignation: input.referenceDesignation ?? null,
        referenceCompany: input.referenceCompany ?? null,
        referenceEmail: input.referenceEmail ?? null,
        referencePhone: input.referencePhone ?? null,
        relationship: input.relationship ?? null,
        notes: input.notes ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
