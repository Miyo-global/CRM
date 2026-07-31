import { db } from "@/lib/db";
import {
  appraisalAcknowledgements,
  appraisalCategories,
  appraisalCategoryRatings,
  appraisals,
  appraisalStages,
  organizationMembers,
} from "@/lib/db/schema";
import { ROLES } from "@/lib/constants/roles";
import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type AppraisalStage =
  | "CYCLE_INITIATION"
  | "SELF_REVIEW"
  | "MANAGER_REVIEW"
  | "CEO_REVIEW"
  | "CALIBRATION"
  | "RATING_APPROVED"
  | "COMPENSATION_REVIEW"
  | "PROMOTION_REVIEW"
  | "FINAL_APPROVAL"
  | "DISCUSSION"
  | "EMPLOYEE_ACK"
  | "CLOSED";

export const APPRAISAL_STAGE_ORDER: AppraisalStage[] = [
  "CYCLE_INITIATION",
  "SELF_REVIEW",
  "MANAGER_REVIEW",
  "CEO_REVIEW",
  "CALIBRATION",
  "RATING_APPROVED",
  "COMPENSATION_REVIEW",
  "PROMOTION_REVIEW",
  "FINAL_APPROVAL",
  "DISCUSSION",
  "EMPLOYEE_ACK",
  "CLOSED",
];

export function nextStage(current: AppraisalStage): AppraisalStage | null {
  const i = APPRAISAL_STAGE_ORDER.indexOf(current);
  if (i < 0 || i >= APPRAISAL_STAGE_ORDER.length - 1) return null;
  return APPRAISAL_STAGE_ORDER[i + 1] ?? null;
}

const STAGE_SLA_MS = 7 * 24 * 60 * 60 * 1000;

export function dueAtFromNow(): Date {
  return new Date(Date.now() + STAGE_SLA_MS);
}

type CategoryRow = InferSelectModel<typeof appraisalCategories>;
type RatingRow = InferSelectModel<typeof appraisalCategoryRatings>;

export function computeOverallRating(
  categories: CategoryRow[],
  ratings: RatingRow[]
): string | null {
  const catById = new Map(categories.map((c) => [c.id, c]));
  let sum = 0;
  let wsum = 0;
  for (const r of ratings) {
    const cat = catById.get(r.categoryId);
    if (!cat) continue;
    if (cat.ratingType === "TEXT") continue;
    const score = r.managerScore;
    if (score == null) continue;
    const w = Number(cat.weight);
    const n = Number(score);
    if (!Number.isFinite(n) || !Number.isFinite(w)) continue;
    sum += n * w;
    wsum += w;
  }
  if (wsum <= 0) return null;
  return (sum / wsum).toFixed(2);
}

export async function loadCategories(): Promise<CategoryRow[]> {
  return db.select().from(appraisalCategories).orderBy(appraisalCategories.sortOrder);
}

export async function seedRatingsForAppraisal(appraisalId: number): Promise<void> {
  const cats = await loadCategories();
  if (cats.length === 0) return;
  await db.insert(appraisalCategoryRatings).values(
    cats.map((c) => ({
      appraisalId,
      categoryId: c.id,
    }))
  );
}

export async function getCeoUserId(orgId: string): Promise<string | null> {
  const row = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, ROLES.CEO)),
    columns: { userId: true },
  });
  return row?.userId ?? null;
}

export async function getHrUserId(orgId: string): Promise<string | null> {
  const row = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, ROLES.HR)),
    columns: { userId: true },
  });
  return row?.userId ?? null;
}

export async function resolveStageAssignee(
  orgId: string,
  stage: AppraisalStage,
  appraisal: { userId: string; reviewerId: string | null },
  initiatorId: string | null
): Promise<string | null> {
  switch (stage) {
    case "CYCLE_INITIATION":
      return initiatorId;
    case "SELF_REVIEW":
      return appraisal.userId;
    case "MANAGER_REVIEW":
      return appraisal.reviewerId ?? (await getHrUserId(orgId)) ?? (await getCeoUserId(orgId));
    case "CEO_REVIEW":
      return (await getCeoUserId(orgId)) ?? (await getHrUserId(orgId));
    case "CALIBRATION":
      return (await getHrUserId(orgId)) ?? (await getCeoUserId(orgId));
    case "RATING_APPROVED":
      return (await getCeoUserId(orgId)) ?? (await getHrUserId(orgId));
    case "COMPENSATION_REVIEW":
      return (await getHrUserId(orgId)) ?? (await getCeoUserId(orgId));
    case "PROMOTION_REVIEW":
      return appraisal.reviewerId ?? (await getCeoUserId(orgId)) ?? (await getHrUserId(orgId));
    case "FINAL_APPROVAL":
      return (await getCeoUserId(orgId)) ?? (await getHrUserId(orgId));
    case "DISCUSSION":
      return appraisal.reviewerId ?? (await getHrUserId(orgId)) ?? (await getCeoUserId(orgId));
    case "EMPLOYEE_ACK":
      return appraisal.userId;
    case "CLOSED":
      return null;
    default:
      return null;
  }
}

export async function assertSelfRatingsComplete(appraisalId: number): Promise<string | null> {
  const cats = await loadCategories();
  const ratings = await db.query.appraisalCategoryRatings.findMany({
    where: eq(appraisalCategoryRatings.appraisalId, appraisalId),
  });
  const byCat = new Map(ratings.map((r) => [r.categoryId, r]));
  for (const c of cats) {
    const r = byCat.get(c.id);
    if (!r) return `Missing rating row for category ${c.name}`;
    if (c.ratingType === "NUMERIC" || c.ratingType === "BOTH") {
      if (r.selfScore == null) return `Self numeric rating required: ${c.name}`;
    }
    if (c.ratingType === "TEXT" || c.ratingType === "BOTH") {
      if (!r.selfText?.trim()) return `Self text required: ${c.name}`;
    }
  }
  return null;
}

export async function assertManagerRatingsComplete(appraisalId: number): Promise<string | null> {
  const cats = await loadCategories();
  const ratings = await db.query.appraisalCategoryRatings.findMany({
    where: eq(appraisalCategoryRatings.appraisalId, appraisalId),
  });
  const byCat = new Map(ratings.map((r) => [r.categoryId, r]));
  for (const c of cats) {
    const r = byCat.get(c.id);
    if (!r) return `Missing rating row for category ${c.name}`;
    if (c.ratingType === "NUMERIC" || c.ratingType === "BOTH") {
      if (r.managerScore == null) return `Manager numeric rating required: ${c.name}`;
    }
    if (c.ratingType === "TEXT" || c.ratingType === "BOTH") {
      if (!r.managerComment?.trim()) return `Manager text required: ${c.name}`;
    }
  }
  return null;
}

export async function refreshOverallRating(appraisalId: number): Promise<void> {
  const [cats, ratings] = await Promise.all([
    loadCategories(),
    db.query.appraisalCategoryRatings.findMany({
      where: eq(appraisalCategoryRatings.appraisalId, appraisalId),
    }),
  ]);
  const overall = computeOverallRating(cats, ratings);
  await db
    .update(appraisals)
    .set({ overallRating: overall ?? null, updatedAt: new Date() })
    .where(eq(appraisals.id, appraisalId));
}

export async function getPendingStageForAppraisal(appraisalId: number, currentStage: AppraisalStage) {
  if (currentStage === "CLOSED") return null;
  return db.query.appraisalStages.findFirst({
    where: and(
      eq(appraisalStages.appraisalId, appraisalId),
      eq(appraisalStages.stage, currentStage),
      eq(appraisalStages.status, "PENDING")
    ),
  });
}

export async function insertPendingStage(
  appraisalId: number,
  stage: AppraisalStage,
  assigneeId: string | null
): Promise<void> {
  await db.insert(appraisalStages).values({
    appraisalId,
    stage,
    assigneeId,
    status: "PENDING",
    startedAt: new Date(),
    dueAt: dueAtFromNow(),
  });
}

export async function reopenAppraisalWorkflow(
  appraisalId: number,
  orgId: string,
  initiatorId: string
): Promise<void> {
  await db.delete(appraisalAcknowledgements).where(eq(appraisalAcknowledgements.appraisalId, appraisalId));
  await db.delete(appraisalStages).where(eq(appraisalStages.appraisalId, appraisalId));
  await db
    .update(appraisals)
    .set({
      currentStage: "CYCLE_INITIATION",
      updatedAt: new Date(),
    })
    .where(and(eq(appraisals.id, appraisalId), eq(appraisals.orgId, orgId)));

  const due = dueAtFromNow();
  await db.insert(appraisalStages).values({
    appraisalId,
    stage: "CYCLE_INITIATION",
    assigneeId: initiatorId,
    status: "PENDING",
    startedAt: new Date(),
    dueAt: due,
  });
}
