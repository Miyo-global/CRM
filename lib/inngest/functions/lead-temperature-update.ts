
import { inngest } from "../client";
import { db } from "@/lib/db";
import { leads, leadActivities } from "@/lib/db/schema";
import { eq, and, gte, sql, notExists, isNull } from "drizzle-orm";

export const leadTemperatureUpdate = inngest.createFunction(
  {
    id: "lead-temperature-update",
    name: "Update Lead Temperature (Daily)",
    triggers: { cron: "0 2 * * *" },
  },
  async ({ step }) => {
    const now = new Date();
    const hot3d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const warm14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const activeLeads = await step.run("fetch-active-leads", async () => {
      return db.query.leads.findMany({
        where: and(
          sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
          isNull(leads.deletedAt)
        ),
        columns: { id: true, orgId: true, priority: true },
      });
    });

    if (!activeLeads.length) return { updated: 0 };

    let hotCount = 0;
    let warmCount = 0;
    let coldCount = 0;

    await step.run("update-temperatures", async () => {
      const hotResult = await db
        .update(leads)
        .set({ priority: "HOT" })
        .where(
          and(
            sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
            isNull(leads.deletedAt),
            sql`EXISTS (
              SELECT 1 FROM ${leadActivities}
              WHERE ${leadActivities.leadId} = ${leads.id}
              AND ${leadActivities.createdAt} >= ${hot3d.toISOString()}
            )`
          )
        )
        .returning({ id: leads.id });
      hotCount = hotResult.length;

      const warmResult = await db
        .update(leads)
        .set({ priority: "WARM" })
        .where(
          and(
            sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
            isNull(leads.deletedAt),
            sql`EXISTS (
              SELECT 1 FROM ${leadActivities}
              WHERE ${leadActivities.leadId} = ${leads.id}
              AND ${leadActivities.createdAt} >= ${warm14d.toISOString()}
            )`,
            sql`NOT EXISTS (
              SELECT 1 FROM ${leadActivities}
              WHERE ${leadActivities.leadId} = ${leads.id}
              AND ${leadActivities.createdAt} >= ${hot3d.toISOString()}
            )`
          )
        )
        .returning({ id: leads.id });
      warmCount = warmResult.length;

      const coldResult = await db
        .update(leads)
        .set({ priority: "COLD" })
        .where(
          and(
            sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
            isNull(leads.deletedAt),
            sql`NOT EXISTS (
              SELECT 1 FROM ${leadActivities}
              WHERE ${leadActivities.leadId} = ${leads.id}
              AND ${leadActivities.createdAt} >= ${warm14d.toISOString()}
            )`
          )
        )
        .returning({ id: leads.id });
      coldCount = coldResult.length;
    });

    return { updated: hotCount + warmCount + coldCount, hot: hotCount, warm: warmCount, cold: coldCount };
  }
);
