import { inngest } from "../client";
import { db } from "@/lib/db";
import { candidateSlaTracking, interviewSlas, candidates } from "@/lib/db/schema";
import { eq, ne, and, notInArray, inArray } from "drizzle-orm";
import { notifyByRoles } from "@/server/actions/create-notification";

export const interviewSlaCheck = inngest.createFunction(
  { id: "interview-sla-check", name: "Interview SLA Check", triggers: { cron: "*/15 * * * *" } },
  async ({ step }) => {
    const results = await step.run("check-interview-sla-statuses", async () => {
      const now = new Date();

      const trackingRecords = await db
        .select({
          id: candidateSlaTracking.id,
          orgId: candidateSlaTracking.orgId,
          candidateId: candidateSlaTracking.candidateId,
          stage: candidateSlaTracking.stage,
          status: candidateSlaTracking.status,
          enteredAt: candidateSlaTracking.enteredAt,
          breachedAt: candidateSlaTracking.breachedAt,
        })
        .from(candidateSlaTracking)
        .innerJoin(candidates, eq(candidateSlaTracking.candidateId, candidates.id))
        .where(
          and(
            ne(candidateSlaTracking.status, "BREACHED"),
            ne(candidateSlaTracking.status, "COMPLETE"),
            notInArray(candidates.status, ["HIRED", "REJECTED"]),
          )
        )
        .limit(500);

      if (trackingRecords.length === 0) return { updated: 0, breached: 0 };

      const orgIds = [...new Set(trackingRecords.map((r) => r.orgId))];

      const slaPolicies = await db
        .select()
        .from(interviewSlas)
        .where(inArray(interviewSlas.orgId, orgIds));

      const policyMap = new Map(
        slaPolicies.map((p) => [`${p.orgId}:${p.stage}`, p])
      );

      const breachedIds: number[] = [];
      const atRiskIds: number[] = [];
      const breachedRecords: typeof trackingRecords = [];
      const atRiskRecords: typeof trackingRecords = [];

      for (const record of trackingRecords) {
        const policy = policyMap.get(`${record.orgId}:${record.stage}`);
        if (!policy) continue;

        const elapsedHours =
          (now.getTime() - new Date(record.enteredAt).getTime()) / (1000 * 60 * 60);

        if (elapsedHours >= policy.maxHours) {
          breachedIds.push(record.id);
          breachedRecords.push({ ...record, breachedAt: now });
        } else if (elapsedHours >= policy.warningHours && record.status === "ON_TRACK") {
          atRiskIds.push(record.id);
          atRiskRecords.push(record);
        }
      }

      if (breachedIds.length > 0) {
        await db
          .update(candidateSlaTracking)
          .set({ status: "BREACHED", breachedAt: now, updatedAt: now })
          .where(inArray(candidateSlaTracking.id, breachedIds));
      }

      if (atRiskIds.length > 0) {
        await db
          .update(candidateSlaTracking)
          .set({ status: "AT_RISK", updatedAt: now })
          .where(inArray(candidateSlaTracking.id, atRiskIds));
      }

      const policyForRecord = (r: (typeof trackingRecords)[0]) =>
        policyMap.get(`${r.orgId}:${r.stage}`)!;

      const notifyPromises: Promise<unknown>[] = [
        ...breachedRecords.map((record) => {
          const policy = policyForRecord(record);
          const elapsedHours = Math.round(
            (now.getTime() - new Date(record.enteredAt).getTime()) / (1000 * 60 * 60)
          );
          return notifyByRoles(record.orgId, ["HR", "CEO"], {
            type: "WARNING",
            title: "Interview SLA Breached",
            message: `Candidate #${record.candidateId} has exceeded the ${policy.maxHours}h SLA for stage "${record.stage}".`,
            link: `/hr/recruitment/candidates/${record.candidateId}`,
            metadata: { candidateId: record.candidateId, stage: record.stage, elapsedHours },
          });
        }),
        ...atRiskRecords.map((record) => {
          const policy = policyForRecord(record);
          const elapsedHours = Math.round(
            (now.getTime() - new Date(record.enteredAt).getTime()) / (1000 * 60 * 60)
          );
          return notifyByRoles(record.orgId, ["HR"], {
            type: "INFO",
            title: "Interview SLA At Risk",
            message: `Candidate #${record.candidateId} is approaching the ${policy.maxHours}h SLA limit for stage "${record.stage}" (${elapsedHours}h elapsed).`,
            link: `/hr/recruitment/candidates/${record.candidateId}`,
            metadata: { candidateId: record.candidateId, stage: record.stage, elapsedHours },
          });
        }),
      ];

      await Promise.allSettled(notifyPromises);

      return { updated: breachedIds.length + atRiskIds.length, breached: breachedIds.length };
    });

    return results;
  }
);
