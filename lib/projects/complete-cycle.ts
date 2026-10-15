import { and, eq, inArray, isNull, ne, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cycles, tickets } from "@/lib/db/schema";
import { recordTicketActivity } from "@/lib/projects/record-ticket-activity";

const DONE_STATUSES = ["DONE", "CLOSED", "CANCELLED", "COMPLETED", "RESOLVED"];

type CompleteInput = { orgId: string; projectId: number; cycleId: number; carryForwardCycleId: number | null; actorId: string };
export type CompleteOutcome =
  | { kind: "done"; carried: number }
  | { kind: "not_found" }
  | { kind: "invalid_target"; message: string };

export async function completeCycle(input: CompleteInput): Promise<CompleteOutcome> {
  const scope = and(eq(cycles.projectId, input.projectId), eq(cycles.orgId, input.orgId));
  if (input.carryForwardCycleId === input.cycleId) {
    return { kind: "invalid_target", message: "Choose a different cycle to carry work into" };
  }

  const result = await db.transaction(async (tx) => {
    const [cycle] = await tx.select({ id: cycles.id }).from(cycles).where(and(scope, eq(cycles.id, input.cycleId))).for("update");
    if (!cycle) return { kind: "not_found" } as const;

    if (input.carryForwardCycleId !== null) {
      const [target] = await tx
        .select({ id: cycles.id, status: cycles.status })
        .from(cycles)
        .where(and(scope, eq(cycles.id, input.carryForwardCycleId)));
      if (!target) return { kind: "invalid_target", message: "That cycle is not in this project" } as const;
      if (target.status === "completed") return { kind: "invalid_target", message: "You can't carry work into a completed cycle" } as const;
    }

    const unfinished = await tx
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          eq(tickets.cycleId, input.cycleId),
          eq(tickets.projectId, input.projectId),
          isNull(tickets.deletedAt),
          notInArray(tickets.status, DONE_STATUSES),
        ),
      );
    const ids = unfinished.map((t) => t.id);
    if (ids.length > 0) {
      await tx.update(tickets).set({ cycleId: input.carryForwardCycleId, updatedAt: new Date() }).where(inArray(tickets.id, ids));
    }
    await tx
      .update(cycles)
      .set({ status: "completed", updatedAt: new Date() })
      .where(and(scope, eq(cycles.id, input.cycleId), ne(cycles.status, "completed")));
    return { kind: "done", carried: ids } as const;
  });

  if (result.kind !== "done") return result;
  for (const ticketId of result.carried) {
    await recordTicketActivity(
      { orgId: input.orgId, projectId: input.projectId, ticketId, actorId: input.actorId },
      [{ action: "cycle_changed", field: "cycleId", fromValue: String(input.cycleId), toValue: input.carryForwardCycleId ? String(input.carryForwardCycleId) : null }],
    );
  }
  return { kind: "done", carried: result.carried.length };
}
