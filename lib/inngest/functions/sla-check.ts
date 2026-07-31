import { inngest } from "../client";
import { db } from "@/lib/db";
import { leads, crmSla } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { subHours } from "date-fns";

const DEFAULT_RESPONSE_HOURS = 24;

export const slaCheck = inngest.createFunction(
  { id: "sla-check", name: "Check Lead SLA Breaches", triggers: { cron: "*/15 * * * *" } },
  async ({ step }) => {
    const breachedLeads = await step.run("find-sla-breached-leads", async () => {
      const now = new Date();

      const policies = await db.query.crmSla.findMany();

      const defaultPolicy = policies.find((p) => p.priority === "medium") || policies[0];
      const maxResponseHours = defaultPolicy?.firstResponseHours ?? DEFAULT_RESPONSE_HOURS;

      const cutoffTime = subHours(now, maxResponseHours);

      return db.query.leads.findMany({
        where: and(
          eq(leads.status, "NEW"),
          lte(leads.createdAt, cutoffTime)
        ),
        with: {
          assignedTo: {
            columns: { id: true, name: true, email: true },
          },
        },
        limit: 100,
      });
    });

    if (breachedLeads.length === 0) {
      return { breached: 0, notified: 0 };
    }

    const notified = await step.run("send-sla-breach-notifications", async () => {
      let count = 0;

      for (const lead of breachedLeads) {
        if (!lead.assignedTo?.id || !lead.createdAt) continue;

        const hoursOverdue = Math.round(
          (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60)
        );

        await inngest.send({
          name: "crm/lead.sla.breached",
          data: {
            leadId: lead.id,
            orgId: lead.orgId,
            assignedTo: lead.assignedTo.id,
            managerId: null,
            hoursOverdue,
          },
        });

        await inngest.send({
          name: "notification/send",
          data: {
            userId: lead.assignedTo.id,
            type: "sla_breach",
            title: "SLA Breach Warning",
            message: `Lead "${lead.name}" has not been contacted in ${hoursOverdue} hours`,
            link: `/crm/leads/${lead.id}`,
            channels: ["in_app", "push", "email"],
          },
        });

        count++;
      }

      return count;
    });

    return { breached: breachedLeads.length, notified };
  }
);
