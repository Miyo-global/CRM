import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { apiKeys, leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { evaluateAssignmentRules, recalculateLeadScore, applySlaPolicy } from "@/server/lib/lead-triggers";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z
    .enum([
      "referral",
      "campaign",
      "cold_call",
      "website",
      "social_media",
      "walk_in",
      "other",
    ])
    .optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const rawKey = req.headers.get("X-API-Key");
  if (!rawKey) {
    return err("Missing X-API-Key header", 401);
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.keyHash, keyHash),
      eq(apiKeys.isRevoked, false)
    ),
  });

  if (!apiKey) {
    return err("Invalid or revoked API key", 401);
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return err("API key has expired", 401);
  }

  const rl = await checkRateLimit("api-key-ingest", apiKey.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  if (apiKey.scopes && apiKey.scopes.length > 0) {
    const hasScope =
      apiKey.scopes.includes("leads:write") ||
      apiKey.scopes.includes("leads:*") ||
      apiKey.scopes.includes("*");
    if (!hasScope) {
      return err("API key does not have leads:write scope", 403);
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid request body", 422);
  }

  const input = parsed.data;

  if (!input.name && !input.email && !input.phone) {
    return err("At least one of name, email, or phone is required", 422);
  }

  const [lead] = await db
    .insert(leads)
    .values({
      orgId: apiKey.orgId,
      name: input.name ?? input.email ?? input.phone ?? "Unknown",
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      source: input.source ?? "other",
      notes: input.notes ?? null,
      status: "NEW" as const,
    })
    .returning({ id: leads.id });

  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .catch(() => undefined);

  void Promise.allSettled([
    evaluateAssignmentRules(db, apiKey.orgId, lead.id).catch((e: unknown) =>
      logger.error("Ingest: assignment rules failed", { leadId: lead.id, error: e })
    ),
    recalculateLeadScore(db, apiKey.orgId, lead.id).catch((e: unknown) =>
      logger.error("Ingest: lead scoring failed", { leadId: lead.id, error: e })
    ),
    applySlaPolicy(db, apiKey.orgId, lead.id).catch((e: unknown) =>
      logger.error("Ingest: SLA policy failed", { leadId: lead.id, error: e })
    ),
  ]);

  return ok({ id: lead.id }, 201);
}
