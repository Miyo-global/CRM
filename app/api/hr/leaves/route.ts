import { getTodayString } from "@/lib/date-utils";
import { withAuth, ok, err, parseBody, userErrorOr500 } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, lte, gte, desc, notInArray, sql } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { ALLOWED_LEAVE_TYPE_NAMES, resolveInitialBalance } from "@/lib/leave-policy";
import { HR_LEAVE_NOTIFY_EMAIL } from "@/lib/constants/hr-leave-routing";
import {
  ensureLeaveTypes,
  ensureUserBalances,
} from "@/server/actions/leave-actions/leave-balance";
import { createNotification, notifyByRoles } from "@/server/actions/create-notification";
import { leaveApproverRolesFor } from "@/lib/hr/leave-approvers";
import { z } from "zod";
import { storedFileRefSchema } from "@/lib/validations/stored-file-ref";
import { leaveReasonSchema } from "@/lib/validations/leave-request";
import type { NextRequest } from "next/server";
import { sendLeaveRequestEmail } from "@/lib/email";
import { resolveLeaveApprovers } from "@/lib/hr/leave-approver-chain";
import { resolveLeaveApprover } from "@/lib/hr/leave-approvals-server";
import { deductApprovedLeaveBalance } from "@/lib/hr/deduct-leave-balance";
import { checkLeaveRequest } from "@/lib/hr/leave-request-check";
import { afterResponse } from "@/lib/after-response";

const createLeaveSchema = z.object({
  leaveTypeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  reason: leaveReasonSchema,
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  approverId: z.string().optional(),
  attachmentUrl: storedFileRefSchema.optional(),
  isHalfDay: z.boolean().optional().default(false),
  halfDayPeriod: z.enum(["AM", "PM"]).optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const userId = session.user.id;

    const seededTypes = await ensureLeaveTypes(orgId);
    const allowedSeeded = seededTypes
      .filter((t) => ALLOWED_LEAVE_TYPE_NAMES.has(t.name))
      .map((t) => ({ id: t.id, name: t.name, daysPerYear: t.daysPerYear }));
    await ensureUserBalances(orgId, userId, allowedSeeded);

    const [rawBalances, allTypes, requests, user, member] = await Promise.all([
      db
        .select({
          id: leaveBalances.id,
          leaveTypeId: leaveBalances.leaveTypeId,
          balance: leaveBalances.balance,
          typeName: leaveTypes.name,
          daysPerYear: leaveTypes.daysPerYear,
        })
        .from(leaveBalances)
        .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
        .where(
          and(
            eq(leaveBalances.userId, userId),
            eq(leaveBalances.orgId, orgId),
            eq(leaveBalances.year, Number(getTodayString().slice(0, 4))),
          ),
        ),
      db.query.leaveTypes.findMany({ where: eq(leaveTypes.orgId, orgId) }),
      db.query.leaveRequests.findMany({
        where: and(eq(leaveRequests.userId, userId), eq(leaveRequests.orgId, orgId)),
        with: {
          leaveType: { columns: { id: true, name: true, daysPerYear: true } },
          approver: { columns: { id: true, name: true, firstName: true, lastName: true } },
        },
        orderBy: [desc(leaveRequests.createdAt)],
        limit: 200,
      }),
      db.query.users.findFirst({ where: eq(users.id, userId), columns: { joiningDate: true } }),
      db.query.organizationMembers.findFirst({ where: eq(organizationMembers.userId, userId) }),
    ]);

    // "X of Y" counts against what this person was granted this year, not the
    // full-year figure: a mid-year joiner's prorated casual leave read as days
    // already used (R2-EMP-06).
    const balanceYear = Number(getTodayString().slice(0, 4));
    const joinedOn = user?.joiningDate ?? new Date(balanceYear, 0, 1);
    const seenNames = new Set<string>();
    const balances = rawBalances
      .filter((b) => {
        if (!b.typeName || !ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName) || seenNames.has(b.typeName)) return false;
        seenNames.add(b.typeName);
        return true;
      })
      .map((b) => ({
        ...b,
        entitled: resolveInitialBalance(b.typeName!, b.daysPerYear ?? 0, joinedOn, balanceYear),
      }));

    const seenTypeNames = new Set<string>();
    const types = allTypes.filter((t) => {
      if (seenTypeNames.has(t.name)) return false;
      seenTypeNames.add(t.name);
      return true;
    });

    const approvers = await resolveLeaveApprovers(orgId, userId);

    return ok({
      balances,
      types,
      requests,
      joiningDate: user?.joiningDate ?? null,
      approvers,
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await parseBody(req, createLeaveSchema);

      if (!body.leaveTypeId || !body.startDate || !body.endDate) {
        return err("leaveTypeId, startDate, and endDate are required.", 400);
      }

      const normalizedStart = formatDateOnly(new Date(body.startDate));
      const normalizedEnd = formatDateOnly(new Date(body.endDate));

      if (normalizedStart > normalizedEnd) {
        return err("Start date must be before or equal to end date.", 400);
      }

      // One decision, shared with GET /api/hr/leaves/preview so the form
      // cannot promise what this route refuses (QA-0050).
      const check = await checkLeaveRequest({
        orgId: session.orgId,
        userId: session.user.id,
        leaveTypeId: body.leaveTypeId,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        isHalfDay: body.isHalfDay ?? false,
      });
      if (check.error) return err(check.error, 400);

      // Route the request up the approver chain before inserting, so the
      // approvals list and badge have an owner for it (A27).
      const requester = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { id: true, role: true, reportingTo: true },
      });
      const approver = await resolveLeaveApprover(session.orgId, {
        id: session.user.id,
        role: requester?.role ?? session.user.role,
        reportingTo: requester?.reportingTo ?? null,
      });

      const inserted = await db.transaction(async (tx) => {
        // Serialise applies per person: two quick submits both passed the
        // overlap check before either inserted, creating two requests and two
        // approver emails (QA-0010 / R3-0008).
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`leave-apply:${session.user.id}`}))`);
        const overlapping = await tx.query.leaveRequests.findFirst({
          where: and(
            eq(leaveRequests.userId, session.user.id),
            eq(leaveRequests.orgId, session.orgId),
            lte(leaveRequests.startDate, normalizedEnd),
            gte(leaveRequests.endDate, normalizedStart),
            notInArray(leaveRequests.status, ["REJECTED", "CANCELLED"]),
          ),
        });

        if (overlapping) return false;

        const [row] = await tx.insert(leaveRequests).values({
          orgId: session.orgId,
          userId: session.user.id,
          leaveTypeId: body.leaveTypeId,
          startDate: normalizedStart,
          endDate: normalizedEnd,
          reason: body.reason,
          priority: body.priority ?? "MEDIUM",
          approverId: approver.approverId,
          attachmentUrl: body.attachmentUrl ?? null,
          isHalfDay: body.isHalfDay ?? false,
          halfDayPeriod: body.halfDayPeriod ?? null,
          // Nobody in the org can approve this one (see resolveLeaveApprover).
          status: approver.autoApprove ? "APPROVED" : "PENDING",
        }).returning({ id: leaveRequests.id });

        // An auto-approved leave is an approved leave: deduct it in the same
        // transaction, or the balance never moved (QA-0018).
        if (row?.id && approver.autoApprove) {
          await deductApprovedLeaveBalance(tx, {
            id: row.id,
            orgId: session.orgId,
            userId: session.user.id,
            leaveTypeId: body.leaveTypeId,
            startDate: normalizedStart,
            endDate: normalizedEnd,
            isHalfDay: body.isHalfDay ?? false,
          });
        }

        return row?.id ?? false;
      });

      if (!inserted) {
        return err(
          "You already have a leave request for overlapping dates.",
          409
        );
      }

      const startStr = formatDateOnly(new Date(body.startDate));
      const endStr = formatDateOnly(new Date(body.endDate));
      const leaveLabel = check.leaveTypeName ?? "Leave";
      const reasonText = body.reason ?? "No reason provided";
      const employeeName = session.user.name ?? "Employee";

      // Notify once, after the insert succeeded, and only the people who can
      // act on it — the all-HR fan-out sent duplicates, including for requests
      // that were rejected as overlapping (A31).
      afterResponse("hr/leaves", async () => {
        if (approver.autoApprove) return;

        // Exactly one approver email per apply (QA-0010). The HR inbox is a
        // fallback for a request nobody owns, not a second copy.
        let recipientEmail: string | null = null;
        let recipientName = "Approver";
        if (approver.approverId) {
          const approverUser = await db.query.users.findFirst({
            where: eq(users.id, approver.approverId),
            columns: { email: true, name: true },
          });
          if (approverUser?.email) {
            recipientEmail = approverUser.email.trim();
            recipientName = approverUser.name ?? "Approver";
          }
        }
        if (!recipientEmail && HR_LEAVE_NOTIFY_EMAIL) {
          recipientEmail = HR_LEAVE_NOTIFY_EMAIL;
          recipientName = "HR";
        }

        if (recipientEmail) {
          await sendLeaveRequestEmail(
            recipientEmail,
            recipientName,
            employeeName,
            leaveLabel,
            startStr,
            endStr,
            reasonText,
            {
              dayCount: check.requestedDays,
              balanceAfter: check.balanceAfter,
              leaveId: typeof inserted === "number" ? inserted : undefined,
            },
          );
        }

        if (approver.approverId) {
          await createNotification({
            orgId: session.orgId,
            userId: approver.approverId,
            type: "WARNING",
            title: "Leave request pending",
            message: `${employeeName} requested ${leaveLabel} from ${startStr} to ${endStr}.`,
            link: "/hr/leaves",
          });
        } else {
          // Unowned (e.g. an Admin's leave with no Super Admin free): tell
          // everyone who can act on it, never the requester (QA-AUTH-05).
          await notifyByRoles(session.orgId, leaveApproverRolesFor(requester?.role ?? session.user.role), {
            type: "WARNING",
            title: "Leave request pending",
            message: `${employeeName} requested ${leaveLabel} from ${startStr} to ${endStr}.`,
            link: "/hr/leaves",
            excludeUserId: session.user.id,
            // The one email already went to the HR inbox above (QA-0010).
            email: false,
          });
        }
      });

      return ok({ success: true });
    } catch (e) {
      return userErrorOr500(e, { route: "hr/leaves", orgId: session.orgId }, "Request failed.");
    }
  }, req);
}
