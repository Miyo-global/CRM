import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, or, ilike, sql, isNull } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { email, phone } = parseQuery(req, querySchema);

    if (!email && !phone) {
      return ok({ duplicates: [] });
    }

    const conditions = [];

    if (email) {
      conditions.push(ilike(leads.email, email.trim()));
    }
    if (phone) {

      const normalized = phone.replace(/[\s\-+()]/g, "");
      const last10 = normalized.slice(-10);
      if (last10.length >= 10) {
        conditions.push(sql`REPLACE(REPLACE(REPLACE(${leads.phone}, ' ', ''), '-', ''), '+', '') LIKE ${"%" + last10}`);
      }
    }

    if (conditions.length === 0) {
      return ok({ duplicates: [] });
    }

    const duplicates = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        company: leads.company,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, session.orgId),
          isNull(leads.deletedAt),
          or(...conditions),
        ),
      )
      .limit(5);

    return ok({ duplicates });
  });
}
