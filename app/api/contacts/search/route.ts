import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().min(2).max(100),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const parsed = parseQuery(req, searchSchema);
    const q = `%${parsed.q}%`;

    const results = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        phone: contacts.phone,
        company: contacts.company,
        jobTitle: contacts.title,
        image: contacts.avatarUrl,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.orgId, session.orgId),
          or(
            ilike(contacts.name, q),
            ilike(contacts.email, q),
            ilike(contacts.phone, q),
          ),
        ),
      )
      .limit(20);

    return ok(results);
  });
}
