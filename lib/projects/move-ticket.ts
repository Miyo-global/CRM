import { and, eq, inArray, isNull, ne, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectStatuses, tickets } from "@/lib/db/schema";
import { computeRank, effectiveRank } from "@/lib/projects/ticket-rank";

export type MoveInput = {
  orgId: string;
  projectId: number;
  ticketId: number;
  status?: string;
  beforeTicketId?: number;
  afterTicketId?: number;
  version?: number;
};

export type MoveOutcome =
  | { kind: "moved"; ticket: { id: number; status: string; rank: string | null; version: number }; fromStatus: string }
  | { kind: "not_found" }
  | { kind: "invalid"; message: string }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "wip"; message: string };

async function rebalance(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], orgId: string, projectId: number) {
  await tx.execute(sql`
    UPDATE ${tickets} AS t SET rank = r.n * 1000
    FROM (
      SELECT id, row_number() OVER (ORDER BY COALESCE(rank, "order" * 1000), id) AS n
      FROM ${tickets} WHERE project_id = ${projectId} AND org_id = ${orgId} AND deleted_at IS NULL
    ) AS r
    WHERE t.id = r.id
  `);
}

export async function moveTicket(input: MoveInput): Promise<MoveOutcome> {
  const neighbourIds = [input.beforeTicketId, input.afterTicketId].filter((id): id is number => id !== undefined);
  if (neighbourIds.includes(input.ticketId)) return { kind: "invalid", message: "A ticket cannot be its own neighbour" };
  if (input.beforeTicketId !== undefined && input.beforeTicketId === input.afterTicketId) {
    return { kind: "invalid", message: "Neighbours must be different tickets" };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${input.projectId})`);
    const live = and(eq(tickets.projectId, input.projectId), eq(tickets.orgId, input.orgId), isNull(tickets.deletedAt));

    const [current] = await tx
      .select({ id: tickets.id, status: tickets.status, version: tickets.version })
      .from(tickets)
      .where(and(live, eq(tickets.id, input.ticketId)))
      .for("update");
    if (!current) return { kind: "not_found" } as const;
    if (input.version !== undefined && input.version !== current.version) {
      return { kind: "conflict", currentVersion: current.version } as const;
    }

    const status = input.status ?? current.status;

    if (status !== current.status) {
      const [column] = await tx
        .select({ wipLimit: projectStatuses.wipLimit })
        .from(projectStatuses)
        .where(and(eq(projectStatuses.projectId, input.projectId), eq(projectStatuses.name, status)))
        .limit(1);
      if (column?.wipLimit != null) {
        const [{ n }] = await tx
          .select({ n: count() })
          .from(tickets)
          .where(and(live, eq(tickets.status, status), ne(tickets.id, input.ticketId)));
        if (Number(n) >= column.wipLimit) {
          return { kind: "wip", message: `Column "${status}" is at its WIP limit of ${column.wipLimit}. Move or finish a ticket there first.` } as const;
        }
      }
    }

    const loadNeighbours = async () =>
      neighbourIds.length === 0
        ? []
        : tx
            .select({ id: tickets.id, status: tickets.status, rank: tickets.rank, order: tickets.order })
            .from(tickets)
            .where(and(live, inArray(tickets.id, neighbourIds)));

    let neighbours = await loadNeighbours();
    if (neighbours.length !== neighbourIds.length) return { kind: "invalid", message: "Neighbour ticket not found" } as const;
    if (neighbours.some((n) => n.status !== status)) {
      return { kind: "invalid", message: "Neighbours must be in the destination column" } as const;
    }

    const rankOf = (id: number | undefined) => {
      if (id === undefined) return null;
      const n = neighbours.find((row) => row.id === id);
      return n ? effectiveRank(n.rank, n.order) : null;
    };

    let result = computeRank(rankOf(input.beforeTicketId), rankOf(input.afterTicketId));
    if ("rebalance" in result) {
      await rebalance(tx, input.orgId, input.projectId);
      neighbours = await loadNeighbours();
      result = computeRank(rankOf(input.beforeTicketId), rankOf(input.afterTicketId));
      if ("rebalance" in result) return { kind: "invalid", message: "Neighbours are out of order. Refresh the board and try again." } as const;
    }

    const [moved] = await tx
      .update(tickets)
      .set({ status, rank: String(result.rank), updatedAt: new Date() })
      .where(and(live, eq(tickets.id, input.ticketId)))
      .returning({ id: tickets.id, status: tickets.status, rank: tickets.rank, version: tickets.version });

    return { kind: "moved", ticket: moved, fromStatus: current.status } as const;
  });
}
