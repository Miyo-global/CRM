import { db } from "@/lib/db";
import { terminationReasons } from "@/lib/db/schema";
import { DEFAULT_TERMINATION_REASONS } from "@/lib/hr/termination-reason-config";
import { and, asc, eq } from "drizzle-orm";
import {
  isDuplicateTerminationReasonLabel,
  normalizeTerminationReasonLabel,
} from "@/lib/hr/termination-reason-config";

export type TerminationReasonRow = typeof terminationReasons.$inferSelect;

export async function seedDefaultTerminationReasons(
  orgId: string,
  userId: string,
): Promise<void> {
  await db
    .insert(terminationReasons)
    .values(
      DEFAULT_TERMINATION_REASONS.map((label, idx) => ({
        orgId,
        label,
        isActive: true,
        sortOrder: idx,
        createdById: userId,
      })),
    )
    .onConflictDoNothing();
}

export async function listTerminationReasonsForOrg(
  orgId: string,
): Promise<TerminationReasonRow[]> {
  return db
    .select()
    .from(terminationReasons)
    .where(eq(terminationReasons.orgId, orgId))
    .orderBy(asc(terminationReasons.sortOrder), asc(terminationReasons.id));
}

export async function ensureTerminationReasonsForOrg(
  orgId: string,
  userId: string,
): Promise<TerminationReasonRow[]> {
  let rows = await listTerminationReasonsForOrg(orgId);

  if (rows.length === 0) {
    await seedDefaultTerminationReasons(orgId, userId);
    rows = await listTerminationReasonsForOrg(orgId);
  }

  return rows;
}

export async function findDuplicateTerminationReasonLabel(
  orgId: string,
  label: string,
  excludeId?: number,
): Promise<TerminationReasonRow | undefined> {
  const rows = await db
    .select()
    .from(terminationReasons)
    .where(eq(terminationReasons.orgId, orgId));

  const excludeLabel =
    excludeId != null
      ? rows.find((row) => row.id === excludeId)?.label
      : undefined;

  if (isDuplicateTerminationReasonLabel(label, rows, excludeLabel)) {
    const normalized = normalizeTerminationReasonLabel(label);
    return rows.find(
      (row) =>
        normalizeTerminationReasonLabel(row.label) === normalized &&
        row.id !== excludeId,
    );
  }

  return undefined;
}

export {
  activeTerminationReasonLabels,
  isAllowedTerminationReason,
} from "@/lib/hr/termination-reason-config";
