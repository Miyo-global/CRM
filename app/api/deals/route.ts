import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { getDeals } from "@/server/queries/crm";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { z } from "zod";

const listSchema = z.object({
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
  assignedToId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  value: z.coerce.number().min(0).optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).default("LEAD"),
  probability: z.number().min(0).max(100).optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedCloseDate: z.string().date().optional(),
  notes: z.string().optional(),
  leadId: z.number().optional(),
  clientId: z.number().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);
    const data = await getDeals(session.orgId!, {
      ...filters,
      role: session.user.role ?? undefined,
      userId: session.user.id,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [deal] = await db.insert(deals).values({
      orgId: session.orgId!,
      name: input.name,
      value: String(input.value ?? 0),
      stage: input.stage,
      probability:
        input.stage === "WON" ? 100 : input.stage === "LOST" ? 0 : input.probability ?? 0,
      contactPerson: input.contactPerson || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      assignedToId: input.assignedToId || session.user.id,
      expectedCloseDate: input.expectedCloseDate || null,
      notes: input.notes || null,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
    }).returning();

    await invalidateCache(CACHE_KEYS.dealsForecast(session.orgId));
    if (deal) {
      void createAuditLog({
        action: "deal.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(deal.id),
        targetType: "deal",
        metadata: { name: deal.name, stage: deal.stage, value: deal.value },
      }).catch(() => {});
    }
    return ok(deal, 201);
  });
}
