import { db } from "@/lib/db";
import {
  organizationMembers,
  users,
  departments,
  jobPostings,
  candidates,
  candidateApplications,
  resignations,
  terminations,
  performanceReviews,
  appraisals,
  goals,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count, inArray, isNotNull } from "drizzle-orm";
import { logger } from "@/lib/logger";

export interface AnalyticsFilter {
  orgId: string;
  from?: string;
  to?: string;
  departmentId?: number;
}

const DEFAULT_FROM = () => `${new Date().getFullYear()}-01-01`;
const DEFAULT_TO = () => `${new Date().getFullYear()}-12-31`;

function resolveRange(filter: AnalyticsFilter) {
  return {
    from: filter.from || DEFAULT_FROM(),
    to: filter.to || DEFAULT_TO(),
  };
}

async function deptNameMap(orgId: string): Promise<Map<number, string>> {
  const rows = await db.query.departments.findMany({ where: eq(departments.orgId, orgId) });
  return new Map(rows.map((d) => [d.id, d.name]));
}

export interface RecruitmentAnalytics {
  openPositions: number;
  totalOpenings: number;
  jobsByStatus: { status: string; count: number }[];
  pipelineByStage: { stage: string; count: number }[];
  offersReleased: number;
  offersAccepted: number;
  offerAcceptanceRate: number | null;
  hiredCount: number;
  avgTimeToHireDays: number | null;
  sourceOfHire: { source: string; count: number }[];
}

export async function getRecruitmentAnalytics(filter: AnalyticsFilter): Promise<RecruitmentAnalytics> {
  const { orgId } = filter;
  const { from, to } = resolveRange(filter);
  const fromTs = new Date(`${from}T00:00:00.000Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  try {
    const jobDeptFilter = filter.departmentId
      ? and(eq(jobPostings.orgId, orgId), eq(jobPostings.departmentId, filter.departmentId))
      : eq(jobPostings.orgId, orgId);

    const [
      jobsByStatusRows,
      pipelineRows,
      appsByStatusRows,
      sourceRows,
      timeToHireRows,
    ] = await Promise.all([
      db
        .select({ status: jobPostings.status, count: count(), openings: sql<number>`COALESCE(SUM(${jobPostings.openings}), 0)` })
        .from(jobPostings)
        .where(jobDeptFilter)
        .groupBy(jobPostings.status),

      db
        .select({ stage: candidates.status, count: count() })
        .from(candidates)
        .where(
          and(
            eq(candidates.orgId, orgId),
            gte(candidates.createdAt, fromTs),
            lte(candidates.createdAt, toTs),
          ),
        )
        .groupBy(candidates.status),

      db
        .select({ status: candidateApplications.status, count: count() })
        .from(candidateApplications)
        .where(
          and(
            eq(candidateApplications.orgId, orgId),
            gte(candidateApplications.appliedAt, fromTs),
            lte(candidateApplications.appliedAt, toTs),
          ),
        )
        .groupBy(candidateApplications.status),

      db
        .select({ source: candidates.source, count: count() })
        .from(candidates)
        .where(
          and(
            eq(candidates.orgId, orgId),
            eq(candidates.status, "HIRED"),
            gte(candidates.createdAt, fromTs),
            lte(candidates.createdAt, toTs),
          ),
        )
        .groupBy(candidates.source),

      db
        .select({
          avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${candidates.updatedAt} - ${candidates.createdAt})) / 86400.0)`,
          hired: count(),
        })
        .from(candidates)
        .where(
          and(
            eq(candidates.orgId, orgId),
            eq(candidates.status, "HIRED"),
            gte(candidates.createdAt, fromTs),
            lte(candidates.createdAt, toTs),
          ),
        ),
    ]);

    const jobsByStatus = jobsByStatusRows.map((r) => ({ status: r.status ?? "UNKNOWN", count: Number(r.count) }));
    const openPositions = jobsByStatus
      .filter((j) => j.status === "OPEN" || j.status === "PAUSED")
      .reduce((s, j) => s + j.count, 0);
    const totalOpenings = jobsByStatusRows
      .filter((r) => r.status === "OPEN" || r.status === "PAUSED")
      .reduce((s, r) => s + Number(r.openings ?? 0), 0);

    const appsByStatus = new Map(appsByStatusRows.map((r) => [r.status ?? "UNKNOWN", Number(r.count)]));
    const offersReleased = (appsByStatus.get("OFFERED") ?? 0) + (appsByStatus.get("ACCEPTED") ?? 0);
    const offersAccepted = appsByStatus.get("ACCEPTED") ?? 0;
    const offerAcceptanceRate = offersReleased > 0 ? Number(((offersAccepted / offersReleased) * 100).toFixed(1)) : null;

    const hiredCount = Number(timeToHireRows[0]?.hired ?? 0);
    const avgTimeToHireRaw = timeToHireRows[0]?.avgDays;
    const avgTimeToHireDays = avgTimeToHireRaw != null ? Math.round(Number(avgTimeToHireRaw)) : null;

    return {
      openPositions,
      totalOpenings,
      jobsByStatus,
      pipelineByStage: pipelineRows.map((r) => ({ stage: r.stage ?? "UNKNOWN", count: Number(r.count) })),
      offersReleased,
      offersAccepted,
      offerAcceptanceRate,
      hiredCount,
      avgTimeToHireDays,
      sourceOfHire: sourceRows.map((r) => ({ source: r.source ?? "DIRECT", count: Number(r.count) })),
    };
  } catch (e) {
    logger.error("getRecruitmentAnalytics failed", { orgId, error: e });
    return {
      openPositions: 0,
      totalOpenings: 0,
      jobsByStatus: [],
      pipelineByStage: [],
      offersReleased: 0,
      offersAccepted: 0,
      offerAcceptanceRate: null,
      hiredCount: 0,
      avgTimeToHireDays: null,
      sourceOfHire: [],
    };
  }
}

export interface RetentionAnalytics {
  activeHeadcount: number;
  voluntaryExits: number;
  involuntaryExits: number;
  totalExits: number;
  attritionRate: number;
  exitTrend: { month: string; voluntary: number; involuntary: number }[];
  attritionByDept: { department: string; count: number }[];
}

export async function getRetentionAnalytics(filter: AnalyticsFilter): Promise<RetentionAnalytics> {
  const { orgId } = filter;
  const { from, to } = resolveRange(filter);
  const fromTs = new Date(`${from}T00:00:00.000Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  try {
    const [activeRows, resignationRows, terminationRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            eq(users.isActive, true),
            filter.departmentId ? eq(users.departmentId, filter.departmentId) : undefined,
          ),
        ),

      db
        .select({
          month: sql<string>`to_char(${resignations.createdAt}, 'YYYY-MM')`,
          count: count(),
          departmentId: users.departmentId,
        })
        .from(resignations)
        .innerJoin(users, eq(resignations.userId, users.id))
        .where(
          and(
            eq(resignations.orgId, orgId),
            gte(resignations.createdAt, fromTs),
            lte(resignations.createdAt, toTs),
            filter.departmentId ? eq(users.departmentId, filter.departmentId) : undefined,
          ),
        )
        .groupBy(sql`to_char(${resignations.createdAt}, 'YYYY-MM')`, users.departmentId),

      db
        .select({
          month: sql<string>`to_char(${terminations.effectiveDate}::date, 'YYYY-MM')`,
          count: count(),
          departmentId: users.departmentId,
        })
        .from(terminations)
        .innerJoin(users, eq(terminations.userId, users.id))
        .where(
          and(
            eq(terminations.orgId, orgId),
            gte(terminations.effectiveDate, from),
            lte(terminations.effectiveDate, to),
            filter.departmentId ? eq(users.departmentId, filter.departmentId) : undefined,
          ),
        )
        .groupBy(sql`to_char(${terminations.effectiveDate}::date, 'YYYY-MM')`, users.departmentId),
    ]);

    const dMap = await deptNameMap(orgId);

    const voluntaryExits = resignationRows.reduce((s, r) => s + Number(r.count), 0);
    const involuntaryExits = terminationRows.reduce((s, r) => s + Number(r.count), 0);
    const totalExits = voluntaryExits + involuntaryExits;
    const activeHeadcount = Number(activeRows[0]?.count ?? 0);
    const denominator = activeHeadcount + totalExits;
    const attritionRate = denominator > 0 ? Number(((totalExits / denominator) * 100).toFixed(1)) : 0;

    const trendMap = new Map<string, { voluntary: number; involuntary: number }>();
    for (const r of resignationRows) {
      const cur = trendMap.get(r.month) ?? { voluntary: 0, involuntary: 0 };
      cur.voluntary += Number(r.count);
      trendMap.set(r.month, cur);
    }
    for (const r of terminationRows) {
      const cur = trendMap.get(r.month) ?? { voluntary: 0, involuntary: 0 };
      cur.involuntary += Number(r.count);
      trendMap.set(r.month, cur);
    }
    const exitTrend = Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, voluntary: v.voluntary, involuntary: v.involuntary }));

    const deptMap = new Map<string, number>();
    for (const r of [...resignationRows, ...terminationRows]) {
      const name = r.departmentId ? (dMap.get(r.departmentId) ?? "Other") : "Unassigned";
      deptMap.set(name, (deptMap.get(name) ?? 0) + Number(r.count));
    }
    const attritionByDept = Array.from(deptMap.entries())
      .map(([department, c]) => ({ department, count: c }))
      .sort((a, b) => b.count - a.count);

    return {
      activeHeadcount,
      voluntaryExits,
      involuntaryExits,
      totalExits,
      attritionRate,
      exitTrend,
      attritionByDept,
    };
  } catch (e) {
    logger.error("getRetentionAnalytics failed", { orgId, error: e });
    return {
      activeHeadcount: 0,
      voluntaryExits: 0,
      involuntaryExits: 0,
      totalExits: 0,
      attritionRate: 0,
      exitTrend: [],
      attritionByDept: [],
    };
  }
}

export interface PerformanceAnalytics {
  reviews: { total: number; completed: number; completionRate: number | null } | null;
  appraisals: { total: number; closed: number; completionRate: number | null } | null;
  goals: { total: number; completed: number; completionRate: number | null } | null;
  ratingDistribution: { band: string; count: number }[];
}

export async function getPerformanceAnalytics(filter: AnalyticsFilter): Promise<PerformanceAnalytics> {
  const { orgId } = filter;
  const { from, to } = resolveRange(filter);
  const fromTs = new Date(`${from}T00:00:00.000Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  let reviewsResult: PerformanceAnalytics["reviews"] = null;
  const ratingRows: { rating: number | null }[] = [];
  let appraisalsResult: PerformanceAnalytics["appraisals"] = null;
  let goalsResult: PerformanceAnalytics["goals"] = null;

  try {
    const rows = await db
      .select({ status: performanceReviews.status, count: count(), rating: performanceReviews.overallRating })
      .from(performanceReviews)
      .where(
        and(
          eq(performanceReviews.orgId, orgId),
          gte(performanceReviews.periodStart, from),
          lte(performanceReviews.periodStart, to),
          filter.departmentId
            ? inArray(
                performanceReviews.userId,
                db.select({ id: users.id }).from(users).where(eq(users.departmentId, filter.departmentId)),
              )
            : undefined,
        ),
      )
      .groupBy(performanceReviews.status, performanceReviews.overallRating);

    let totalReviews = 0;
    let completedReviews = 0;
    for (const r of rows) {
      const c = Number(r.count);
      totalReviews += c;
      if (r.status === "COMPLETED") completedReviews += c;
      if (r.rating != null) ratingRows.push({ rating: Number(r.rating) });
    }
    reviewsResult = {
      total: totalReviews,
      completed: completedReviews,
      completionRate: totalReviews > 0 ? Number(((completedReviews / totalReviews) * 100).toFixed(1)) : null,
    };
  } catch (e) {
    logger.warn("getPerformanceAnalytics: performanceReviews unavailable", { orgId, error: e });
  }

  try {
    const rows = await db
      .select({ stage: appraisals.currentStage, count: count(), rating: appraisals.overallRating })
      .from(appraisals)
      .where(
        and(
          eq(appraisals.orgId, orgId),
          gte(appraisals.createdAt, fromTs),
          lte(appraisals.createdAt, toTs),
        ),
      )
      .groupBy(appraisals.currentStage, appraisals.overallRating);

    let totalAppraisals = 0;
    let closedAppraisals = 0;
    for (const r of rows) {
      const c = Number(r.count);
      totalAppraisals += c;
      if (r.stage === "CLOSED" || r.stage === "FINAL_APPROVAL" || r.stage === "EMPLOYEE_ACK") closedAppraisals += c;
      if (r.rating != null) ratingRows.push({ rating: Number(r.rating) });
    }
    appraisalsResult = {
      total: totalAppraisals,
      closed: closedAppraisals,
      completionRate: totalAppraisals > 0 ? Number(((closedAppraisals / totalAppraisals) * 100).toFixed(1)) : null,
    };
  } catch (e) {
    logger.warn("getPerformanceAnalytics: appraisals unavailable", { orgId, error: e });
  }

  try {
    const rows = await db
      .select({ status: goals.status, count: count() })
      .from(goals)
      .where(
        and(
          eq(goals.orgId, orgId),
          gte(goals.startDate, from),
          lte(goals.startDate, to),
          filter.departmentId
            ? inArray(
                goals.userId,
                db.select({ id: users.id }).from(users).where(eq(users.departmentId, filter.departmentId)),
              )
            : undefined,
        ),
      )
      .groupBy(goals.status);

    let totalGoals = 0;
    let completedGoals = 0;
    for (const r of rows) {
      const c = Number(r.count);
      totalGoals += c;
      const st = (r.status ?? "").toUpperCase();
      if (st === "COMPLETED" || st === "ACHIEVED" || st === "DONE") completedGoals += c;
    }
    goalsResult = {
      total: totalGoals,
      completed: completedGoals,
      completionRate: totalGoals > 0 ? Number(((completedGoals / totalGoals) * 100).toFixed(1)) : null,
    };
  } catch (e) {
    logger.warn("getPerformanceAnalytics: goals unavailable", { orgId, error: e });
  }

  const bands = [
    { band: "4.5 - 5", min: 4.5, max: 5.01 },
    { band: "3.5 - 4.5", min: 3.5, max: 4.5 },
    { band: "2.5 - 3.5", min: 2.5, max: 3.5 },
    { band: "1.5 - 2.5", min: 1.5, max: 2.5 },
    { band: "< 1.5", min: -Infinity, max: 1.5 },
  ];
  const ratingDistribution = bands
    .map((b) => ({
      band: b.band,
      count: ratingRows.filter((r) => r.rating != null && r.rating >= b.min && r.rating < b.max).length,
    }))
    .filter((b) => b.count > 0);

  return {
    reviews: reviewsResult,
    appraisals: appraisalsResult,
    goals: goalsResult,
    ratingDistribution,
  };
}

export interface ExecutiveKpis {
  headcount: number;
  attritionRate: number;
  hiringRate: number;
  avgTenureMonths: number | null;
  diversityRatio: number | null;
  openPositions: number;
  orgHealthScore: number;
}

export async function getExecutiveKpis(filter: AnalyticsFilter): Promise<ExecutiveKpis> {
  const { orgId } = filter;
  const { from, to } = resolveRange(filter);

  const baseWhere = and(
    eq(organizationMembers.orgId, orgId),
    eq(users.isActive, true),
    filter.departmentId ? eq(users.departmentId, filter.departmentId) : undefined,
  );

  let headcount = 0;
  let avgTenureMonths: number | null = null;
  let diversityRatio: number | null = null;
  let hires = 0;
  let openPositions = 0;

  try {
    const [hcRows, tenureRows, genderRows, hireRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(baseWhere),

      db
        .select({
          avgMonths: sql<number>`AVG(EXTRACT(EPOCH FROM (now() - ${users.joiningDate}::timestamp)) / 2629800.0)`,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(baseWhere, isNotNull(users.joiningDate))),

      db
        .select({ gender: users.gender, count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(baseWhere)
        .groupBy(users.gender),

      db
        .select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            gte(users.joiningDate, from),
            lte(users.joiningDate, to),
            filter.departmentId ? eq(users.departmentId, filter.departmentId) : undefined,
          ),
        ),
    ]);

    headcount = Number(hcRows[0]?.count ?? 0);
    const tenureRaw = tenureRows[0]?.avgMonths;
    avgTenureMonths = tenureRaw != null ? Number(Number(tenureRaw).toFixed(1)) : null;
    hires = Number(hireRows[0]?.count ?? 0);

    const totalGendered = genderRows.reduce((s, g) => s + Number(g.count), 0);
    const female = genderRows.find((g) => g.gender === "FEMALE");
    diversityRatio = totalGendered > 0 ? Number(((Number(female?.count ?? 0) / totalGendered) * 100).toFixed(1)) : null;
  } catch (e) {
    logger.error("getExecutiveKpis: headcount block failed", { orgId, error: e });
  }

  const retention = await getRetentionAnalytics(filter);
  const recruitment = await getRecruitmentAnalytics(filter);
  openPositions = recruitment.openPositions;

  const hiringRate = headcount > 0 ? Number(((hires / headcount) * 100).toFixed(1)) : 0;

  const attritionScore = Math.max(0, 100 - retention.attritionRate * 2);
  const diversityScore = diversityRatio != null ? Math.min(100, diversityRatio * 2) : 50;
  const tenureScore = avgTenureMonths != null ? Math.min(100, (avgTenureMonths / 36) * 100) : 50;
  const orgHealthScore = Math.round(attritionScore * 0.4 + diversityScore * 0.3 + tenureScore * 0.3);

  return {
    headcount,
    attritionRate: retention.attritionRate,
    hiringRate,
    avgTenureMonths,
    diversityRatio,
    openPositions,
    orgHealthScore,
  };
}

export interface HrAnalyticsExtended {
  recruitment: RecruitmentAnalytics;
  retention: RetentionAnalytics;
  performance: PerformanceAnalytics;
  executive: ExecutiveKpis;
}
