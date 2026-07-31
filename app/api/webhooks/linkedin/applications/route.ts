

import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { upsertCandidateFromBoard, normalizeLinkedInPayload } from "@/lib/integrations/job-boards";
import { logger } from "@/lib/logger";

function verifyLinkedInSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LINKEDIN_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-linkedin-signature") ??
    req.headers.get("x-hub-signature-256") ?? null;

  if (!verifyLinkedInSignature(rawBody, signature)) {
    logger.warn("LinkedIn webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payloadObj = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const orgId =
    (typeof payloadObj.orgId === "string" ? payloadObj.orgId : null) ??
    (typeof payloadObj.org_id === "string" ? (payloadObj.org_id as string) : null);
  if (!orgId) {
    logger.warn("LinkedIn webhook: missing orgId in signed payload");
    return NextResponse.json(
      { error: "orgId field required in signed payload body" },
      { status: 400 }
    );
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { id: true },
  });
  if (!org) {
    return NextResponse.json({ received: true, processed: false, reason: "unknown_org" });
  }

  const raw = payload as Record<string, unknown>;
  const applications: unknown[] = Array.isArray(raw.applications)
    ? (raw.applications as unknown[])
    : Array.isArray(raw.elements)
    ? (raw.elements as unknown[])
    : [raw];

  const MAX_APPLICATIONS = 100;
  if (applications.length > MAX_APPLICATIONS) {
    logger.warn("LinkedIn webhook: payload exceeds application limit", {
      orgId,
      count: applications.length,
    });
    return NextResponse.json(
      { error: `Too many applications; limit is ${MAX_APPLICATIONS}` },
      { status: 413 }
    );
  }

  let created = 0;
  let duplicates = 0;
  let failed = 0;

  for (const app of applications) {
    const normalized = normalizeLinkedInPayload(app as Record<string, unknown>);
    if (!normalized) continue;
    try {
      const { isNew } = await upsertCandidateFromBoard(orgId, normalized);
      if (isNew) created++;
      else duplicates++;
    } catch (err) {
      failed++;
      logger.error("LinkedIn webhook: failed to upsert candidate", { err });
    }
  }

  logger.info("LinkedIn webhook processed", { orgId, created, duplicates, failed });
  return NextResponse.json({ received: true, created, duplicates, failed });
}
