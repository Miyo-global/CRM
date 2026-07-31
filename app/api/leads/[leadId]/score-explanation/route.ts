
import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, leadScoringRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ leadId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { leadId: leadIdStr } = await params;
    const leadId = parseInt(leadIdStr, 10);
    if (isNaN(leadId)) return err("Invalid lead ID", 400);

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, session.orgId)));

    if (!lead) return err("Lead not found", 404);

    const rules = await db
      .select()
      .from(leadScoringRules)
      .where(eq(leadScoringRules.orgId, session.orgId));

    const leadRecord = lead as Record<string, unknown>;
    const firedRules: { name: string; field: string; operator: string; value: string; points: number }[] = [];
    let total = 0;

    for (const rule of rules) {
      const fieldValue = leadRecord[rule.field];
      if (fieldValue === undefined || fieldValue === null) continue;

      const strValue = String(fieldValue);
      let match = false;

      switch (rule.operator) {
        case "eq":
          match = strValue === rule.value;
          break;
        case "gt": {
          const lhs = Number(strValue);
          const rhs = Number(rule.value);
          match = !Number.isNaN(lhs) && !Number.isNaN(rhs) && lhs > rhs;
          break;
        }
        case "lt": {
          const lhs = Number(strValue);
          const rhs = Number(rule.value);
          match = !Number.isNaN(lhs) && !Number.isNaN(rhs) && lhs < rhs;
          break;
        }
        case "contains":
          match = strValue.toLowerCase().includes(rule.value.toLowerCase());
          break;
        case "in":
          match = rule.value.split(",").map((v: string) => v.trim()).includes(strValue);
          break;
      }

      if (match) {
        const label = `${rule.field} ${rule.operator} ${rule.value}`;
        firedRules.push({
          name: label,
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
          points: rule.points,
        });
        total += rule.points;
      }
    }

    total = Math.max(0, Math.min(100, total));

    return ok({ score: total, firedRules, totalRules: rules.length });
  });
}
