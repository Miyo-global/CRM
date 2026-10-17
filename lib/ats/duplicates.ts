import "server-only";

import { and, eq, ne, or, sql, type SQLWrapper } from "drizzle-orm";

import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { normalisePhone } from "./phone";
import { linkedinHandle } from "./match";

export interface DuplicateMatch {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  matchedOn: "email" | "phone" | "linkedin";
}

/**
 * MIYO-0644: the same person applying twice. Email is the strong signal;
 * phone and LinkedIn are strong enough to show a banner, not to merge on
 * their own.
 */
export async function findDuplicates(
  orgId: string,
  person: {
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    excludeId?: number;
  },
): Promise<DuplicateMatch[]> {
  const email = person.email?.trim().toLowerCase() || null;
  const phone = normalisePhone(person.phone);
  const handle = linkedinHandle(person.linkedinUrl);
  if (!email && !phone && !handle) return [];

  const conditions: SQLWrapper[] = [];
  if (email) conditions.push(sql`lower(${candidates.email}) = ${email}`);
  if (phone) conditions.push(eq(candidates.phoneNormalized, phone));
  if (handle) conditions.push(sql`lower(${candidates.linkedinUrl}) like ${`%/${handle}%`}`);

  const rows = await db
    .select({
      id: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      phone: candidates.phone,
      phoneNormalized: candidates.phoneNormalized,
      linkedinUrl: candidates.linkedinUrl,
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.orgId, orgId),
        person.excludeId ? ne(candidates.id, person.excludeId) : undefined,
        or(...conditions),
      ),
    )
    .limit(10);

  return rows.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    matchedOn:
      email && row.email.toLowerCase() === email
        ? ("email" as const)
        : phone && row.phoneNormalized === phone
          ? ("phone" as const)
          : ("linkedin" as const),
  }));
}
