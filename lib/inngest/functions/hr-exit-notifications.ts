import { inngest } from "../client";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";


async function getOrgUsersByRoles(orgId: string, roles: string[]): Promise<string[]> {
  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: { user: { columns: { id: true, role: true } } },
  });
  return members
    .filter((m) => m.user && roles.includes(m.user.role ?? ""))
    .map((m) => m.userId);
}

export const onResignationSubmitted = inngest.createFunction(
  { id: "hr-resignation-submitted", name: "Notify HR on Resignation Submitted", triggers: { event: "hr/resignation.submitted" } },
  async ({ event, step }) => {
    const { orgId, employeeName, employeeId } = event.data;

    const recipientIds = await step.run("fetch-hr-ceo", () =>
      getOrgUsersByRoles(orgId, ["HR", "CEO"])
    );

    await step.run("send-notifications", async () => {
      for (const userId of recipientIds.filter((id) => id !== employeeId)) {
        await inngest.send({
          name: "notification/send",
          data: {
            userId,
            type: "info",
            title: "New Resignation Submitted",
            message: `${employeeName} has submitted a resignation request.`,
            link: "/hr/exit",
            channels: ["in_app"],
          },
        });
      }
    });
  }
);

export const onResignationHrApproved = inngest.createFunction(
  { id: "hr-resignation-hr-approved", name: "Notify CEO on HR Resignation Approval", triggers: { event: "hr/resignation.hr_approved" } },
  async ({ event, step }) => {
    const { orgId, employeeName } = event.data;

    const ceoIds = await step.run("fetch-ceo", () =>
      getOrgUsersByRoles(orgId, ["CEO"])
    );

    await step.run("send-ceo-notifications", async () => {
      for (const userId of ceoIds) {
        await inngest.send({
          name: "notification/send",
          data: {
            userId,
            type: "info",
            title: "Resignation Awaiting Your Approval",
            message: `${employeeName}'s resignation has been approved by HR and needs your final approval.`,
            link: "/hr/exit",
            channels: ["in_app"],
          },
        });
      }
    });
  }
);

export const onResignationCeoApproved = inngest.createFunction(
  { id: "hr-resignation-ceo-approved", name: "Notify Employee on CEO Resignation Decision", triggers: { event: "hr/resignation.ceo_approved" } },
  async ({ event, step }) => {
    const { employeeId, approved } = event.data;

    await step.run("notify-employee", async () => {
      await inngest.send({
        name: "notification/send",
        data: {
          userId: employeeId,
          type: approved ? "success" : "warning",
          title: approved ? "Resignation Approved" : "Resignation Rejected",
          message: approved
            ? "Your resignation has been approved. Please ensure a smooth handover."
            : "Your resignation request has been reviewed and rejected by the CEO.",
          link: "/hr/exit",
          channels: ["in_app"],
        },
      });
    });
  }
);

export const onTerminationSubmitted = inngest.createFunction(
  { id: "hr-termination-submitted", name: "Notify CEO on Termination Submitted", triggers: { event: "hr/termination.submitted" } },
  async ({ event, step }) => {
    const { orgId, employeeName } = event.data;

    const ceoIds = await step.run("fetch-ceo", () =>
      getOrgUsersByRoles(orgId, ["CEO"])
    );

    await step.run("send-ceo-notifications", async () => {
      for (const userId of ceoIds) {
        await inngest.send({
          name: "notification/send",
          data: {
            userId,
            type: "warning",
            title: "Termination Pending Your Approval",
            message: `A termination request for ${employeeName} requires your review.`,
            link: "/hr/termination",
            channels: ["in_app"],
          },
        });
      }
    });
  }
);

export const onTerminationCeoApproved = inngest.createFunction(
  { id: "hr-termination-ceo-decision", name: "Notify HR on Termination CEO Decision", triggers: { event: "hr/termination.ceo_decision" } },
  async ({ event, step }) => {
    const { orgId, employeeName, approved } = event.data;

    const hrIds = await step.run("fetch-hr", () =>
      getOrgUsersByRoles(orgId, ["HR"])
    );

    await step.run("send-hr-notifications", async () => {
      for (const userId of hrIds) {
        await inngest.send({
          name: "notification/send",
          data: {
            userId,
            type: approved ? "success" : "info",
            title: approved ? "Termination Approved — Ready to Send" : "Termination Rejected by CEO",
            message: approved
              ? `CEO approved the termination of ${employeeName}. You can now send the termination letter.`
              : `CEO rejected the termination request for ${employeeName}.`,
            link: "/hr/termination",
            channels: ["in_app"],
          },
        });
      }
    });
  }
);
