/**
 * KB-0059: linking a page to a CRM record.
 *
 * The point of the registry is that a link is checked before it is stored: a
 * link to a ticket that does not exist, or to one in another org, is worse than
 * no link, because it looks authoritative on the page. Each target names the
 * table that proves it and whether its module has to be switched on.
 */
import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const RECORD_LINK_TARGET_TYPES = [
  "project",
  "project_ticket",
  "hr_employee",
  "support_ticket",
] as const;
export type RecordLinkTargetType = (typeof RECORD_LINK_TARGET_TYPES)[number];

interface TargetSpec {
  table: string;
  /** Numeric ids are cast; a user id is text. */
  idKind: "int" | "text";
}

const TARGETS: Record<RecordLinkTargetType, TargetSpec> = {
  project: { table: "projects", idKind: "int" },
  project_ticket: { table: "tickets", idKind: "int" },
  hr_employee: { table: "users", idKind: "text" },
  support_ticket: { table: "support_tickets", idKind: "int" },
};

export function isRecordLinkTarget(value: string): value is RecordLinkTargetType {
  return (RECORD_LINK_TARGET_TYPES as readonly string[]).includes(value);
}

/**
 * Which targets a page can link to. The CRM lead, deal and contact targets went
 * with the sales module; links stored to them are no longer listed.
 */
export function availableRecordLinkTargets(): RecordLinkTargetType[] {
  return [...RECORD_LINK_TARGET_TYPES];
}

export type RecordLinkCheck =
  | { ok: true }
  | { ok: false; status: 400 | 404; message: string };

/**
 * Confirms the target exists in this org. `hr_employee` is checked through
 * organization_members, since the CRM has no employees table: an employee is a
 * user with a membership.
 */
export async function checkRecordTarget(
  orgId: string,
  targetType: string,
  targetId: string,
): Promise<RecordLinkCheck> {
  if (!isRecordLinkTarget(targetType)) {
    return { ok: false, status: 400, message: `${targetType} is not a linkable record.` };
  }

  const spec = TARGETS[targetType];

  if (spec.idKind === "int") {
    const numeric = Number(targetId);
    if (!Number.isSafeInteger(numeric) || numeric <= 0) {
      return { ok: false, status: 400, message: "That record id is not valid." };
    }
  }

  // The identifier comes from the registry above, never from the request.
  const rows =
    targetType === "hr_employee"
      ? await db.execute(sql`
          SELECT 1 FROM organization_members
          WHERE org_id = ${orgId} AND user_id = ${targetId} LIMIT 1
        `)
      : await db.execute(
          sql`SELECT 1 FROM ${sql.identifier(spec.table)} WHERE org_id = ${orgId} AND id = ${targetId} LIMIT 1`,
        );

  const found = Array.isArray(rows)
    ? rows.length > 0
    : ((rows as { rows?: unknown[] }).rows?.length ?? 0) > 0;

  return found ? { ok: true } : { ok: false, status: 404, message: "That record was not found." };
}

/** Where a linked record lives in the app, for the link the page renders. */
export function recordHref(targetType: RecordLinkTargetType, targetId: string): string {
  switch (targetType) {
    case "project":
      return `/projects/${targetId}`;
    case "project_ticket":
      return `/tickets/${targetId}`;
    case "hr_employee":
      return `/hr/employees/${targetId}`;
    case "support_ticket":
      return `/support/${targetId}`;
  }
}
