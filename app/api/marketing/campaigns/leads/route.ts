import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNotNull, ilike, or } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, source, q, limit } = parseQuery(req, querySchema);

    const conditions = [
      eq(leads.orgId, session.orgId),
      isNotNull(leads.email),
    ];

    if (status) conditions.push(eq(leads.status, status as "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST"));
    if (source) conditions.push(eq(leads.source, source as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other"));

    if (q) {
      const term = `%${q}%`;
      const search = or(
        ilike(leads.name, term),
        ilike(leads.email, term),
        ilike(leads.company, term)
      );
      if (search) conditions.push(search);
    }

    const rows = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        company: leads.company,
        status: leads.status,
        source: leads.source,
      })
      .from(leads)
      .where(and(...conditions))
      .orderBy(leads.createdAt)
      .limit(limit);

    return ok({ leads: rows, total: rows.length });
  });
}
