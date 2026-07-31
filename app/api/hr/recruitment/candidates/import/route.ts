import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const candidateRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  source: z.string().optional(),
  skills: z.string().optional(),
});

const importSchema = z.object({
  candidates: z.array(candidateRowSchema).min(1, "At least one candidate required").max(500),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can bulk import.", 403);

    const body = importSchema.parse(await req.json());

    const seen = new Set<string>();
    const dedupedRows = body.candidates
      .map((c) => ({ ...c, email: c.email.toLowerCase().trim() }))
      .filter((c) => {
        if (seen.has(c.email)) return false;
        seen.add(c.email);
        return true;
      });

    const emails = dedupedRows.map((c) => c.email);
    const existing = emails.length
      ? await db
          .select({ email: candidates.email })
          .from(candidates)
          .where(and(eq(candidates.orgId, session.orgId), inArray(candidates.email, emails)))
      : [];
    const existingEmails = new Set(existing.map((e) => e.email.toLowerCase().trim()));

    const values = dedupedRows
      .filter((c) => !existingEmails.has(c.email))
      .map((c) => ({
        orgId: session.orgId,
        firstName: c.firstName.trim(),
        lastName: c.lastName.trim(),
        email: c.email,
        phone: c.phone,
        currentCompany: c.currentCompany,
        currentRole: c.currentRole,
        source: c.source ?? "IMPORT",
        skills: c.skills ? c.skills.split(",").map((s) => s.trim()) : undefined,
        status: "NEW" as const,
      }));

    if (values.length === 0) {
      return ok({ imported: 0, skipped: body.candidates.length }, 200);
    }

    const inserted = await db.insert(candidates).values(values).returning({ id: candidates.id });

    return ok({ imported: inserted.length, skipped: body.candidates.length - inserted.length }, 201);
  });
}
