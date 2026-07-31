
import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  leaveRequests,
  users,
  leaveTypes,
  organizations,
  organizationMembers,
  notifications,
} from "@/lib/db/schema";
import { eq, and, lt, isNull, inArray } from "drizzle-orm";
import { subHours, format } from "date-fns";
import { logger } from "@/lib/logger";
import { ROLES } from "@/lib/constants/roles";
import { HR_LEAVE_NOTIFY_EMAIL } from "@/lib/constants/hr-leave-routing";
import {
  sendLeaveHrMissedEscalationEmail,
  sendLeaveCeoDelegateEscalationEmail,
} from "@/lib/email/hr-leaves";
import type { LeaveEscalationRow } from "@/lib/email-templates";

const ESCALATION_HOURS = 48;

function displayName(user: {
  name: string | null;
  firstName: string | null;
  lastName?: string | null;
  email: string | null;
}): string {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return user.name?.trim() || full || user.email || "Team member";
}

async function buildEscalationRows(
  requests: Array<{
    id: number;
    userId: string;
    leaveTypeId: number | null;
    startDate: string;
    endDate: string;
    createdAt: Date | string | null;
  }>,
): Promise<LeaveEscalationRow[]> {
  return Promise.all(
    requests.map(async (request) => {
      const employee = await db.query.users.findFirst({
        where: eq(users.id, request.userId),
        columns: { name: true, firstName: true, lastName: true, email: true },
      });
      const leaveType = request.leaveTypeId
        ? await db.query.leaveTypes.findFirst({
            where: eq(leaveTypes.id, request.leaveTypeId),
            columns: { name: true },
          })
        : null;

      return {
        employeeName: employee ? displayName(employee) : request.userId,
        leaveType: leaveType?.name ?? "Leave",
        startDate: request.startDate,
        endDate: request.endDate,
        submittedAt: request.createdAt
          ? format(new Date(request.createdAt), "dd MMM yyyy")
          : "",
      };
    }),
  );
}

async function getActiveMembersByRoles(orgId: string, roles: string[]) {
  return db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        inArray(organizationMembers.role, roles),
        eq(users.isActive, true),
      ),
    );
}

async function emailUniqueRecipients(
  recipients: Array<{ email: string | null; name: string | null; firstName: string | null }>,
  send: (email: string, name: string) => Promise<void>,
) {
  const emailed = new Set<string>();
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const key = recipient.email.trim().toLowerCase();
    if (emailed.has(key)) continue;
    emailed.add(key);
    const name = displayName({
      name: recipient.name,
      firstName: recipient.firstName,
      lastName: null,
      email: recipient.email,
    });
    await send(recipient.email, name);
  }
}

export const leaveEscalation = inngest.createFunction(
  {
    id: "leave-escalation",
    name: "Escalate Stale Leave Requests (48h)",
    triggers: { cron: "0 */6 * * *" },
  },
  async ({ step }) => {
    const staleRequests = await step.run("find-stale-leave-requests", async () => {
      const cutoff = subHours(new Date(), ESCALATION_HOURS);
      return db
        .select({
          id: leaveRequests.id,
          orgId: leaveRequests.orgId,
          userId: leaveRequests.userId,
          leaveTypeId: leaveRequests.leaveTypeId,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          createdAt: leaveRequests.createdAt,
        })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.status, "PENDING"),
            lt(leaveRequests.createdAt, cutoff),
            isNull(leaveRequests.hrEscalationSentAt),
          ),
        )
        .limit(200);
    });

    if (staleRequests.length === 0) {
      return { escalated: 0, hrEmails: 0, ceoEmails: 0 };
    }

    const result = await step.run("send-leave-escalation-emails", async () => {
      const byOrg = new Map<string, typeof staleRequests>();
      for (const request of staleRequests) {
        const list = byOrg.get(request.orgId) ?? [];
        list.push(request);
        byOrg.set(request.orgId, list);
      }

      let escalated = 0;
      let hrEmails = 0;
      let ceoEmails = 0;

      for (const [orgId, requests] of byOrg) {
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, orgId),
          columns: { name: true },
        });
        const orgName = org?.name ?? "your organization";
        const rows = await buildEscalationRows(requests);
        const requestIds = requests.map((r) => r.id);
        const count = requests.length;

        const hrMembers = await getActiveMembersByRoles(orgId, [ROLES.HR, ROLES.ADMIN]);
        const ceoMembers = await getActiveMembersByRoles(orgId, [ROLES.CEO]);

        try {
          await emailUniqueRecipients(hrMembers, async (email, name) => {
            await sendLeaveHrMissedEscalationEmail(email, name, orgName, rows);
            hrEmails += 1;
          });

          const hrInboxKey = HR_LEAVE_NOTIFY_EMAIL.trim().toLowerCase();
          const hrAlreadyEmailed = hrMembers.some(
            (member) => member.email?.trim().toLowerCase() === hrInboxKey,
          );
          if (!hrAlreadyEmailed) {
            await sendLeaveHrMissedEscalationEmail(
              HR_LEAVE_NOTIFY_EMAIL,
              "HR Team",
              orgName,
              rows,
            );
            hrEmails += 1;
          }

          await emailUniqueRecipients(ceoMembers, async (email, name) => {
            await sendLeaveCeoDelegateEscalationEmail(email, name, orgName, rows);
            ceoEmails += 1;
          });

          const hrMemberIds = hrMembers.map((member) => member.userId);
          if (hrMemberIds.length > 0) {
            await db.insert(notifications).values(
              hrMemberIds.map((userId) => ({
                orgId,
                userId,
                type: "WARNING" as const,
                title: "Missed leave request review",
                message: `${count} leave request${count > 1 ? "s have" : " has"} been pending for more than 2 days. Please approve or reject ${count > 1 ? "them" : "it"}.`,
                link: "/hr/leaves",
              })),
            );
          }

          const ceoMemberIds = ceoMembers.map((member) => member.userId);
          if (ceoMemberIds.length > 0) {
            await db.insert(notifications).values(
              ceoMemberIds.map((userId) => ({
                orgId,
                userId,
                type: "WARNING" as const,
                title: "Leave requests awaiting action",
                message: `HR may be busy — ${count} leave request${count > 1 ? "s are" : " is"} still pending after 2 days. You can approve or reject from the HR portal if needed.`,
                link: "/hr/leaves",
              })),
            );
          }

          await db
            .update(leaveRequests)
            .set({ hrEscalationSentAt: new Date() })
            .where(inArray(leaveRequests.id, requestIds));

          escalated += count;
        } catch (error) {
          logger.error("leave-escalation: failed for org", {
            error,
            orgId,
            requestIds,
          });
        }
      }

      return { escalated, hrEmails, ceoEmails };
    });

    return result;
  },
);
