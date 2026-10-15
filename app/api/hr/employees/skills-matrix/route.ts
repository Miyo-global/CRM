import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills, organizationMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cached, CACHE_TTL, invalidateCache } from "@/lib/cache";
import { backfillEmployeeSkillsForOrg } from "@/lib/hr/sync-employee-skills";
import { canonicalizeSkill, normalizeSkill } from "@/lib/hr/skills-catalog";


export async function GET() {
  return withAuth(async (session) => {
    const existingSkills = await db.query.employeeSkills.findFirst({
      where: eq(employeeSkills.orgId, session.orgId),
      columns: { id: true },
    });
    if (!existingSkills) {
      await backfillEmployeeSkillsForOrg(session.orgId);
      await invalidateCache(`hr:skills-matrix:${session.orgId}`);
    }

    const data = await cached(
      `hr:skills-matrix:${session.orgId}`,
      async () => {
        const allSkills = await db.query.employeeSkills.findMany({
          where: eq(employeeSkills.orgId, session.orgId),
          with: { user: { columns: { id: true, name: true, image: true } } },
        });

        const members = await db
          .select({
            userId: organizationMembers.userId,
            name: users.name,
            image: users.image,
            profileSkills: users.skills,
          })
          .from(organizationMembers)
          .leftJoin(users, eq(users.id, organizationMembers.userId))
          .where(eq(organizationMembers.orgId, session.orgId));

        const canonicalByNorm = new Map<string, string>();
        const resolveCanonical = (raw: string): string => {
          const result = canonicalizeSkill(raw);
          if (!result) return raw.trim();
          const norm = normalizeSkill(result.canonical);
          const existing = canonicalByNorm.get(norm);
          if (existing) return existing;
          canonicalByNorm.set(norm, result.canonical);
          return result.canonical;
        };

        const skillSet = new Set<string>();
        const matrixMap = new Map<string, Map<string, number>>();
        const certMap = new Map<
          string,
          Map<string, { certified: boolean; validUntil: string | null }>
        >();
        for (const skill of allSkills) {
          const canonical = resolveCanonical(skill.skillName);
          if (!canonical) continue;
          skillSet.add(canonical);
          if (!matrixMap.has(skill.userId)) matrixMap.set(skill.userId, new Map());
          const userSkills = matrixMap.get(skill.userId)!;
          const existing = userSkills.get(canonical);
          const level = skill.level ?? 1;
          if (existing == null || level > existing) userSkills.set(canonical, level);

          if (!certMap.has(skill.userId)) certMap.set(skill.userId, new Map());
          const userCerts = certMap.get(skill.userId)!;
          const prevCert = userCerts.get(canonical);
          const certified = !!skill.certifiedAt;
          const validUntil = skill.validUntil ?? null;
          const soonest =
            prevCert?.validUntil && validUntil
              ? prevCert.validUntil < validUntil
                ? prevCert.validUntil
                : validUntil
              : (validUntil ?? prevCert?.validUntil ?? null);
          userCerts.set(canonical, {
            certified: certified || !!prevCert?.certified,
            validUntil: soonest,
          });
        }

        // Skills typed into a profile are synced into employee_skills on the
        // employee PATCH path only, so anyone edited elsewhere (an admin
        // editing their own profile) never showed up in the matrix (A43).
        // Fold the profile list in here so the matrix reflects both sources.
        for (const member of members) {
          for (const name of member.profileSkills ?? []) {
            const canonical = resolveCanonical(name);
            if (!canonical) continue;
            skillSet.add(canonical);
            if (!matrixMap.has(member.userId)) matrixMap.set(member.userId, new Map());
            const userSkills = matrixMap.get(member.userId)!;
            if (userSkills.get(canonical) == null) userSkills.set(canonical, 1);
          }
        }

        const skillNames = [...skillSet].sort((a, b) => a.localeCompare(b));

        const employeesWithSkills = members
          .filter((m) => matrixMap.has(m.userId))
          .map((m) => ({
            userId: m.userId,
            name: m.name,
            image: m.image,
            skills: Object.fromEntries(matrixMap.get(m.userId) ?? new Map<string, number>()),
            certs: Object.fromEntries(
              certMap.get(m.userId) ??
                new Map<string, { certified: boolean; validUntil: string | null }>(),
            ),
          }))
          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

        return { employees: employeesWithSkills, skills: skillNames };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
