import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { employeeSkills, organizationMembers, users, jobPostings } from "@/lib/db/schema";
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

        const openSkillNorms = new Set<string>();
        for (const skillSetMap of matrixMap.values()) {
          for (const skillName of skillSetMap.keys()) openSkillNorms.add(normalizeSkill(skillName));
        }

        const openings = await db
          .select({
            id: jobPostings.id,
            title: jobPostings.title,
            requiredSkills: jobPostings.requiredSkills,
            status: jobPostings.status,
          })
          .from(jobPostings)
          .where(eq(jobPostings.orgId, session.orgId));

        const roleGaps = openings
          .filter((j) => j.status === "OPEN" || j.status === "DRAFT" || j.status === "PAUSED")
          .map((job) => {
            const seen = new Set<string>();
            const required: { skill: string; covered: boolean }[] = [];
            for (const raw of job.requiredSkills ?? []) {
              const canonical = resolveCanonical(raw);
              if (!canonical) continue;
              const norm = normalizeSkill(canonical);
              if (seen.has(norm)) continue;
              seen.add(norm);
              required.push({ skill: canonical, covered: openSkillNorms.has(norm) });
            }
            const missing = required.filter((r) => !r.covered).length;
            return {
              jobId: job.id,
              title: job.title,
              status: job.status,
              required,
              missingCount: missing,
              coveredCount: required.length - missing,
            };
          })
          .filter((g) => g.required.length > 0)
          .sort((a, b) => b.missingCount - a.missingCount || a.title.localeCompare(b.title));

        return { employees: employeesWithSkills, skills: skillNames, roleGaps };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
