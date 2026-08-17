import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  users,
  organizationMembers,
  departments,
  branches,
  employeeSkills,
  leaveRequests,
} from "@/lib/db/schema";
import { eq, and, sql, inArray, lte, gte, or, exists } from "drizzle-orm";
import { z } from "zod";
import {
  normalizeSkill,
  canonicalizeSkill,
  getAcceptableNorms,
  skillMatchesQuery,
  isPlausibleSkillLabel,
} from "@/lib/hr/skills-catalog";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

/**
 * Ranking (server-side, primary sort for "relevance"):
 * 1. relevanceScore (higher = better match signal: catalog match, proficiency, tenure, breadth)
 * 2. matched structured level (employee_skills) high → low
 * 3. experience years high → low
 * 4. number of displayed skills high → low
 * 5. name A → Z (stable tie-break)
 */
const querySchema = z.object({
  skill: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  department: z
    .string()
    .max(200)
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t ? t : undefined;
    }),
  role: z
    .string()
    .max(64)
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t ? t : undefined;
    }),
  branch: z
    .string()
    .max(200)
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t ? t : undefined;
    }),
  /** When true, include users with is_active = false (default: active only). */
  includeInactive: z.preprocess((v) => v === "true" || v === "1", z.boolean()).default(false),
});

export interface ExpertSkillLevel {
  name: string;
  /** Proficiency from employee_skills when present; null if only listed on profile without a level row. */
  level: number | null;
  recognized: boolean;
}

export interface ExpertResult {
  userId: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  role: string;
  department: string | null;
  branch: string | null;
  location: string | null;
  email: string | null;
  skills: string[];
  skillLevels: ExpertSkillLevel[];
  matchedSkill: string;
  matchedLevel: number | null;
  matchedRecognized: boolean;
  experienceYears: string | null;
  available: boolean;
  status: string;
  relevanceScore: number;
  isActive: boolean;
}

export async function GET(req: NextRequest) {
  return withAuth<ExpertResult[]>(async (session) => {
    const q = parseQuery(req, querySchema);
    const rawQuery = q.skill.trim();
    if (!rawQuery) return err("skill query param is required", 400);

    const normalizedQuery = normalizeSkill(rawQuery);
    const acceptableNorms = getAcceptableNorms(rawQuery);

    const skillExistsProfile = sql`EXISTS (
      SELECT 1 FROM unnest(${users.skills}) AS s
      WHERE ${sql.join(
        [
          sql`regexp_replace(lower(s), '[^a-z0-9]', '', 'g') LIKE ${"%" + normalizedQuery + "%"}`,
          ...acceptableNorms.map(
            (n) => sql`regexp_replace(lower(s), '[^a-z0-9]', '', 'g') = ${n}`,
          ),
        ],
        sql` OR `,
      )}
    )`;

    const esPredicates = [
      sql`regexp_replace(lower(${employeeSkills.skillName}), '[^a-z0-9]', '', 'g') LIKE ${"%" + normalizedQuery + "%"}`,
      ...acceptableNorms.map(
        (n) =>
          sql`regexp_replace(lower(${employeeSkills.skillName}), '[^a-z0-9]', '', 'g') = ${n}`,
      ),
    ];

    const skillExistsEs = exists(
      db
        .select({ id: employeeSkills.id })
        .from(employeeSkills)
        .where(
          and(
            eq(employeeSkills.userId, users.id),
            eq(employeeSkills.orgId, session.orgId),
            or(...esPredicates),
          ),
        ),
    );

    const skillMatchesUser = or(skillExistsProfile, skillExistsEs);

    const whereParts = [eq(organizationMembers.orgId, session.orgId), skillMatchesUser];
    if (!q.includeInactive) {
      whereParts.push(eq(users.isActive, true));
    }
    if (q.department) {
      whereParts.push(eq(departments.name, q.department));
    }
    if (q.role) {
      whereParts.push(eq(organizationMembers.role, q.role));
    }
    if (q.branch) {
      whereParts.push(eq(branches.name, q.branch));
    }

    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        role: organizationMembers.role,
        email: users.email,
        skills: users.skills,
        experienceYears: users.experienceYears,
        isActive: users.isActive,
        department: departments.name,
        branch: branches.name,
        location: branches.city,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(branches, eq(users.branchId, branches.id))
      .where(and(...whereParts))
      .limit(q.limit);

    const candidateUserIds = rows.map((r) => r.userId);
    const esNamesByUser = new Map<string, string[]>();
    if (candidateUserIds.length > 0) {
      const esRows = await db
        .select({
          userId: employeeSkills.userId,
          skillName: employeeSkills.skillName,
        })
        .from(employeeSkills)
        .where(
          and(eq(employeeSkills.orgId, session.orgId), inArray(employeeSkills.userId, candidateUserIds)),
        );
      for (const row of esRows) {
        if (!row.skillName) continue;
        const list = esNamesByUser.get(row.userId) ?? [];
        list.push(row.skillName);
        esNamesByUser.set(row.userId, list);
      }
    }

    const matched = rows.filter((r) => {
      for (const s of r.skills ?? []) {
        if (!isPlausibleSkillLabel(s)) continue;
        if (skillMatchesQuery(s, rawQuery)) return true;
      }
      for (const s of esNamesByUser.get(r.userId) ?? []) {
        if (!isPlausibleSkillLabel(s)) continue;
        if (skillMatchesQuery(s, rawQuery)) return true;
      }
      return false;
    });

    const userIds = matched.map((r) => r.userId);
    if (userIds.length === 0) return ok([]);

    const skillLevelRows = await db
      .select({
        userId: employeeSkills.userId,
        skillName: employeeSkills.skillName,
        level: employeeSkills.level,
      })
      .from(employeeSkills)
      .where(and(eq(employeeSkills.orgId, session.orgId), inArray(employeeSkills.userId, userIds)));

    type SkillRow = (typeof skillLevelRows)[number];
    const skillLevelRowsByUser = new Map<string, SkillRow[]>();
    for (const row of skillLevelRows) {
      const list = skillLevelRowsByUser.get(row.userId) ?? [];
      list.push(row);
      skillLevelRowsByUser.set(row.userId, list);
    }

    const levelsByUser = new Map<string, Map<string, number>>();
    for (const row of skillLevelRows) {
      if (!row.skillName || !isPlausibleSkillLabel(row.skillName)) continue;
      const canon = canonicalizeSkill(row.skillName);
      if (!canon) continue;
      const key = normalizeSkill(canon.canonical);
      if (row.level == null || Number.isNaN(Number(row.level))) continue;
      const lv = Math.min(5, Math.max(1, Number(row.level)));
      if (!levelsByUser.has(row.userId)) levelsByUser.set(row.userId, new Map());
      const m = levelsByUser.get(row.userId)!;
      m.set(key, Math.max(m.get(key) ?? 0, lv));
    }

    const today = new Date().toLocaleDateString("en-CA", { timeZone: DEFAULT_TIMEZONE });
    const onLeaveRows = await db
      .select({ userId: leaveRequests.userId })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "APPROVED"),
          inArray(leaveRequests.userId, userIds),
          lte(leaveRequests.startDate, today),
          gte(leaveRequests.endDate, today),
        ),
      );
    const onLeave = new Set(onLeaveRows.map((r) => r.userId));

    const queryCanon = canonicalizeSkill(rawQuery);

    const experts: ExpertResult[] = matched.map((r) => {
      const userLevels = levelsByUser.get(r.userId);
      const rawSkills = r.skills ?? [];

      let matchedRaw: string | undefined;
      for (const s of rawSkills) {
        if (!isPlausibleSkillLabel(s)) continue;
        if (skillMatchesQuery(s, rawQuery)) {
          matchedRaw = s;
          break;
        }
      }
      if (!matchedRaw) {
        for (const s of esNamesByUser.get(r.userId) ?? []) {
          if (!isPlausibleSkillLabel(s)) continue;
          if (skillMatchesQuery(s, rawQuery)) {
            matchedRaw = s;
            break;
          }
        }
      }

      const byCanon = new Map<string, ExpertSkillLevel>();
      for (const raw of rawSkills) {
        if (!isPlausibleSkillLabel(raw)) continue;
        const canon = canonicalizeSkill(raw);
        if (!canon) continue;
        const key = normalizeSkill(canon.canonical);
        const levelFromDb = userLevels?.get(key);
        const level =
          levelFromDb == null || Number.isNaN(Number(levelFromDb))
            ? null
            : Math.min(5, Math.max(1, Number(levelFromDb)));
        const existing = byCanon.get(key);
        if (!existing) {
          byCanon.set(key, { name: canon.canonical, level, recognized: canon.recognized });
        } else {
          if (level != null && (existing.level == null || level > existing.level)) {
            existing.level = level;
          }
          existing.recognized = existing.recognized || canon.recognized;
        }
      }

      for (const row of skillLevelRowsByUser.get(r.userId) ?? []) {
        if (!row.skillName || !isPlausibleSkillLabel(row.skillName)) continue;
        const canon = canonicalizeSkill(row.skillName);
        if (!canon) continue;
        const key = normalizeSkill(canon.canonical);
        const coerced =
          row.level == null || Number.isNaN(Number(row.level))
            ? null
            : Math.min(5, Math.max(1, Number(row.level)));
        const existing = byCanon.get(key);
        if (!existing) {
          byCanon.set(key, { name: canon.canonical, level: coerced, recognized: canon.recognized });
        } else {
          if (coerced != null && (existing.level == null || coerced > existing.level)) {
            existing.level = coerced;
          }
          existing.recognized = existing.recognized || canon.recognized;
        }
      }

      const skillLevels = [...byCanon.values()].sort(
        (a, b) =>
          (b.level ?? 0) - (a.level ?? 0) ||
          Number(b.recognized) - Number(a.recognized) ||
          a.name.localeCompare(b.name),
      );

      const matchedCanon = matchedRaw ? canonicalizeSkill(matchedRaw) : null;
      const matchedName = matchedCanon?.canonical ?? queryCanon?.canonical ?? rawQuery;
      const matchedKey = normalizeSkill(matchedName);
      const matchedLevel = userLevels?.get(matchedKey) ?? null;
      const matchedRecognized = matchedCanon?.recognized ?? false;

      const available = !onLeave.has(r.userId);
      const exp = Number(r.experienceYears ?? 0);
      const expPts = Math.min(Number.isNaN(exp) ? 0 : exp, 25);
      const leveledCount = skillLevels.filter((s) => s.level != null).length;

      let matchTier = 70;
      if (
        queryCanon?.recognized &&
        matchedRecognized &&
        matchedCanon &&
        normalizeSkill(queryCanon.canonical) === normalizeSkill(matchedCanon.canonical)
      ) {
        matchTier = 260;
      } else if (matchedRecognized) {
        matchTier = 200;
      } else if (matchedCanon) {
        matchTier = 130;
      }

      const relevanceScore =
        matchTier +
        (matchedLevel ?? 0) * 22 +
        expPts +
        leveledCount * 4 +
        skillLevels.length * 2 +
        (available ? 3 : 0);

      return {
        userId: r.userId,
        name: r.name,
        image: r.image,
        designation: r.designation,
        role: r.role,
        department: r.department,
        branch: r.branch,
        location: r.location,
        email: r.email,
        skills: skillLevels.map((s) => s.name),
        skillLevels,
        matchedSkill: matchedName,
        matchedLevel,
        matchedRecognized,
        experienceYears: r.experienceYears ?? null,
        available,
        status: available ? "Available" : "On leave",
        relevanceScore,
        isActive: r.isActive,
      };
    });

    experts.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      const ml = (b.matchedLevel ?? 0) - (a.matchedLevel ?? 0);
      if (ml !== 0) return ml;
      const ex = Number(b.experienceYears ?? 0) - Number(a.experienceYears ?? 0);
      if (ex !== 0) return ex;
      const sc = b.skillLevels.length - a.skillLevels.length;
      if (sc !== 0) return sc;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    return ok(experts);
  });
}
