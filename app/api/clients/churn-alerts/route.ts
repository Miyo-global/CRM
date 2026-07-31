import { withAuth, ok, err } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

const CHURN_ALERT_ROLES = new Set(["CEO", "HR", "ADMIN", "CUSTOMER_SUPPORT", "SALES"]);

export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!CHURN_ALERT_ROLES.has(role)) {
      return err("Only CRM team can view churn alerts", 403);
    }

    const data = await cached(
      CACHE_KEYS.churnAlerts(session.orgId),
      async () => {
        const atRiskClients = await db
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
            accountManagerId: clients.accountManagerId,
            accountManagerName: users.name,
          })
          .from(clients)
          .leftJoin(users, eq(clients.accountManagerId, users.id))
          .where(
            and(
              eq(clients.orgId, session.orgId),
              or(
                eq(clients.healthStatus, "at_risk"),
                eq(clients.healthStatus, "critical"),
              ),
            ),
          )
          .orderBy(desc(clients.churnRiskScore))
          .limit(20);

        const critical = atRiskClients.filter(c => c.healthStatus === "critical").length;
        const atRisk = atRiskClients.filter(c => c.healthStatus === "at_risk").length;
        return { alerts: atRiskClients, summary: { critical, atRisk, total: atRiskClients.length } };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
