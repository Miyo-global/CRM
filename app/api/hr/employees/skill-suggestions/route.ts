import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { buildSuggestions, isPlausibleSkillLabel, type SkillSuggestion } from "@/lib/hr/skills-catalog";

const querySchema = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export async function GET(req: NextRequest) {
  return withAuth<SkillSuggestion[]>(async (session) => {
    const { q, limit } = parseQuery(req, querySchema);

    const rows = await db
      .select({ skills: users.skills })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true)));

    const counts = new Map<string, number>();
    for (const r of rows) {
      for (const s of r.skills ?? []) {
        const key = s.trim();
        if (!key || !isPlausibleSkillLabel(key)) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const orgSkills = [...counts.entries()].map(([skill, count]) => ({ skill, count }));
    return ok(buildSuggestions(orgSkills, q, limit));
  });
}
