import "server-only";
import { db } from "@/lib/db";
import {
  attendance,
  auditLogs,
  documentAssignments,
  documents,
  expenses,
  handbookVersions,
  helpdeskTickets,
  leaveRequests,
  onboardingDocuments,
  reimbursements,
} from "@/lib/db/schema";
import { and, eq, exists, inArray, or, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/constants/roles";

/** Folders whose files every org member may read (pictures shown across the app). */
const SHARED_FOLDERS = new Set(["avatars", "org-logos", "ticket-comments", "tickets"]);

/** `o/<orgId>/<folder>/...` -> folder; null for legacy keys without the org prefix. */
export function folderOfKey(key: string): string | null {
  const m = /^o\/[^/]+\/([^/]+)\//.exec(key);
  return m ? m[1]! : null;
}

/**
 * Owner-level read check for a stored file (MIYO-0023). The caller has
 * already checked the file belongs to the user's org. Allowed: CEO/HR/Admin;
 * any member for SHARED_FOLDERS and the handbook; otherwise only the user a
 * record ties the file to (their uploads, documents, leave/expense/onboarding
 * attachments, helpdesk tickets, overtime proof).
 *
 * ponytail: candidate resumes/vault are HR-only; interviewers outside HR need
 * an explicit grant if they must read them.
 */
export async function canReadFile(
  user: { id: string; role?: string | null },
  orgId: string,
  fileKey: string,
  originalRef?: string,
): Promise<boolean> {
  if (isAdminOrOwner(user.role)) return true;
  const folder = folderOfKey(fileKey);
  if (folder && SHARED_FOLDERS.has(folder)) return true;

  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const refs = [
    ...new Set(
      [fileKey, publicBase ? `${publicBase}/${fileKey}` : "", originalRef ?? ""].filter(Boolean),
    ),
  ];
  const me = user.id;

  const checks = await Promise.all([
    db.query.auditLogs.findFirst({
      where: and(eq(auditLogs.userId, me), eq(auditLogs.action, "file.upload"), sql`${auditLogs.metadata}->>'fileKey' = ${fileKey}`),
      columns: { id: true },
    }),
    db.query.documents.findFirst({
      where: and(
        eq(documents.orgId, orgId),
        inArray(documents.fileUrl, refs),
        or(
          eq(documents.userId, me),
          eq(documents.isPublic, true),
          exists(
            db.select({ one: sql`1` }).from(documentAssignments).where(
              and(eq(documentAssignments.documentId, documents.id), eq(documentAssignments.userId, me)),
            ),
          ),
        ),
      ),
      columns: { id: true },
    }),
    db.query.handbookVersions.findFirst({
      where: and(eq(handbookVersions.orgId, orgId), inArray(handbookVersions.documentUrl, refs)),
      columns: { id: true },
    }),
    db.query.leaveRequests.findFirst({
      where: and(eq(leaveRequests.userId, me), inArray(leaveRequests.attachmentUrl, refs)),
      columns: { id: true },
    }),
    db.query.expenses.findFirst({
      where: and(eq(expenses.userId, me), inArray(expenses.receiptUrl, refs)),
      columns: { id: true },
    }),
    db.query.reimbursements.findFirst({
      where: and(eq(reimbursements.userId, me), inArray(reimbursements.receiptUrl, refs)),
      columns: { id: true },
    }),
    db.query.onboardingDocuments.findFirst({
      where: and(eq(onboardingDocuments.userId, me), inArray(onboardingDocuments.fileUrl, refs)),
      columns: { id: true },
    }),
    db.query.helpdeskTickets.findFirst({
      where: and(eq(helpdeskTickets.userId, me), inArray(helpdeskTickets.attachmentUrl, refs)),
      columns: { id: true },
    }),
    db.query.attendance.findFirst({
      where: and(eq(attendance.userId, me), inArray(attendance.overtimeProofUrl, refs)),
      columns: { id: true },
    }),
  ]);
  return checks.some(Boolean);
}
