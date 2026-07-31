import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { isRecruitmentHr } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";

const schema = z.object({
  resumeText: z.string().min(1).max(100000),
});

function extractField(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractFromText(text: string) {
  const EMAIL_RE = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/;
  const PHONE_RE = /(\+?[\d\s\-().]{7,15}\d)/;
  const NAME_RE =
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})/m;

  const email = extractField(text, [EMAIL_RE]);
  const phone = extractField(text, [PHONE_RE]);
  const name = extractField(text, [NAME_RE]);

  return { name, email, phone };
}

type Params = { params: Promise<{ candidateId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("Forbidden", 403);
    }

    const { candidateId: cidParam } = await params;
    const candidateId = Number(cidParam);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    const body = await parseBody(req, schema);
    const extracted = extractFromText(body.resumeText);

    await db
      .update(candidates)
      .set({ resumeText: body.resumeText, updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));

    return ok({
      extracted,
      suggestions: {
        name: extracted.name && !candidate.firstName ? extracted.name : null,
        email: extracted.email && !candidate.email ? extracted.email : null,
        phone: extracted.phone && !candidate.phone ? extracted.phone : null,
      },
    });
  });
}
