import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { emailDeliveries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { errorCode } from "@/lib/api/error-code";
import { eventText, parseBounces, verifyZeptoSignature } from "@/lib/email/zeptomail-webhook";

/**
 * ZeptoMail bounce webhook: marks the matching email_deliveries rows bounced.
 * Public on purpose; the caller is verified by the `producer-signature` HMAC
 * with ZEPTOMAIL_WEBHOOK_SECRET (the mail agent's webhook key).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.ZEPTOMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not found.", code: errorCode(404) }, { status: 404 });
  }

  const rawBody = await req.text();
  if (!verifyZeptoSignature(req.headers.get("producer-signature"), rawBody, secret)) {
    return NextResponse.json({ error: "Invalid signature", code: errorCode(401) }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(eventText(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid payload", code: errorCode(400) }, { status: 400 });
  }

  const bounces = parseBounces(payload);
  for (const bounce of bounces) {
    await db
      .update(emailDeliveries)
      .set({ status: "bounced", error: bounce.reason.slice(0, 1000), updatedAt: new Date() })
      .where(eq(emailDeliveries.providerMessageId, bounce.requestId));
  }
  if (bounces.length) logger.info("ZeptoMail bounces recorded", { count: bounces.length });

  return NextResponse.json({ received: true });
}
