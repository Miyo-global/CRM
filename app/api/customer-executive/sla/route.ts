import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";

const SLA_TARGETS: Record<string, { firstResponse: number; resolution: number }> = {
  URGENT: { firstResponse: 2, resolution: 8 },
  HIGH: { firstResponse: 4, resolution: 24 },
  MEDIUM: { firstResponse: 8, resolution: 48 },
  LOW: { firstResponse: 24, resolution: 72 },
};

export async function GET() {
  return withAuth(async (session) => {
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.orgId, session.orgId));

    const now = Date.now();

    interface TicketAnalysis {
      id: number;
      title: string;
      priority: string;
      status: string;
      createdAt: Date;
      resolvedAt: Date | null;
      closedAt: Date | null;
      slaDeadline: Date | null;
      hoursOpen: number;
      resolutionHours: number | null;
      slaTarget: number;
      breached: boolean;
    }

    const analyzed: TicketAnalysis[] = tickets.map((t) => {
      const priority = (t.priority ?? "MEDIUM").toUpperCase();
      const sla = SLA_TARGETS[priority] ?? SLA_TARGETS.MEDIUM;
      const createdMs = t.createdAt ? new Date(t.createdAt).getTime() : now;
      const hoursOpen = (now - createdMs) / 3_600_000;

      const resolvedMs = t.resolvedAt
        ? new Date(t.resolvedAt).getTime()
        : t.closedAt
          ? new Date(t.closedAt).getTime()
          : null;
      const resolutionHours = resolvedMs ? (resolvedMs - createdMs) / 3_600_000 : null;

      let breached = false;
      if (t.slaDeadline) {
        const deadlineMs = new Date(t.slaDeadline).getTime();
        if (resolutionHours !== null) {
          breached = resolvedMs! > deadlineMs;
        } else {
          breached = now > deadlineMs;
        }
      } else {
        if (resolutionHours !== null) {
          breached = resolutionHours > sla.resolution;
        } else if (t.status !== "CLOSED" && t.status !== "RESOLVED") {
          breached = hoursOpen > sla.resolution;
        }
      }

      return {
        id: t.id,
        title: t.title,
        priority,
        status: t.status,
        createdAt: t.createdAt ?? new Date(),
        resolvedAt: t.resolvedAt,
        closedAt: t.closedAt,
        slaDeadline: t.slaDeadline,
        hoursOpen: Math.round(hoursOpen * 10) / 10,
        resolutionHours: resolutionHours !== null ? Math.round(resolutionHours * 10) / 10 : null,
        slaTarget: sla.resolution,
        breached,
      };
    });

    const totalTickets = analyzed.length;
    const slaBreached = analyzed.filter((t) => t.breached).length;
    const withinSla = totalTickets - slaBreached;
    const complianceRate = totalTickets > 0 ? Math.round((withinSla / totalTickets) * 100) : 100;

    const resolvedTickets = analyzed.filter((t) => t.resolutionHours !== null);
    const avgResolutionHours =
      resolvedTickets.length > 0
        ? Math.round(
            (resolvedTickets.reduce((sum, t) => sum + (t.resolutionHours ?? 0), 0) /
              resolvedTickets.length) *
              10
          ) / 10
        : 0;

    const priorities = ["URGENT", "HIGH", "MEDIUM", "LOW"];
    const byPriority = priorities.map((priority) => {
      const group = analyzed.filter((t) => t.priority === priority);
      const groupResolved = group.filter((t) => t.resolutionHours !== null);
      const avgRes =
        groupResolved.length > 0
          ? Math.round(
              (groupResolved.reduce((sum, t) => sum + (t.resolutionHours ?? 0), 0) /
                groupResolved.length) *
                10
            ) / 10
          : 0;
      return {
        priority,
        total: group.length,
        withinSla: group.filter((t) => !t.breached).length,
        breached: group.filter((t) => t.breached).length,
        avgResolutionHours: avgRes,
        slaTarget: SLA_TARGETS[priority]?.resolution ?? 48,
      };
    });

    const recentBreaches = analyzed
      .filter((t) => t.breached)
      .sort((a, b) => b.hoursOpen - a.hoursOpen)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        hoursOpen: t.hoursOpen,
        slaTarget: t.slaTarget,
      }));

    return ok({
      stats: {
        totalTickets,
        withinSla,
        slaBreached,
        complianceRate,
        avgResolutionHours,
      },
      byPriority,
      recentBreaches,
    });
  });
}
