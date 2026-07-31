import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["healthy", "at_risk", "critical"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit } = parseQuery(req, querySchema);

    const data = await cached(
      CACHE_KEYS.clientsHealth(session.orgId),
      async () => {
        const conditions = [eq(clients.orgId, session.orgId)];
        if (status) conditions.push(eq(clients.healthStatus, status));

        const results = await db
          .select({
            id: clients.id,
            name: clients.name,
            company: clients.company,
            healthScore: clients.healthScore,
            healthStatus: clients.healthStatus,
            churnRiskScore: clients.churnRiskScore,
            churnRiskReasoning: clients.churnRiskReasoning,
            lastHealthCheck: clients.lastHealthCheck,
            investmentValue: clients.investmentValue,
            status: clients.status,
          })
          .from(clients)
          .where(and(...conditions))
          .orderBy(asc(clients.healthScore))
          .limit(limit ?? 20);

        const summary = { healthy: 0, at_risk: 0, critical: 0 };
        for (const c of results) {
          const hs = c.healthStatus as keyof typeof summary;
          if (hs in summary) summary[hs]++;
        }
        return { items: results, summary };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
