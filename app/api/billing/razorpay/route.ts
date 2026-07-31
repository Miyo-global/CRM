import { type NextRequest, NextResponse } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { subscriptions, subscriptionPayments } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.orgId, session.orgId),
      with: { payments: { limit: 5, orderBy: (p, { desc }) => [desc(p.createdAt)] } },
    });

    return ok({
      subscription: sub ?? null,
      razorpayKeyId: RAZORPAY_KEY_ID ?? null,
      isConfigured: isRazorpayConfigured(),
    });
  });
}

const createOrderSchema = z.object({
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
});

const PLAN_PRICES = {
  STARTER: 99900,
  PROFESSIONAL: 249900,
  ENTERPRISE: 499900,
} as const;

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isRazorpayConfigured()) {
      return err("Payment gateway not configured. Contact support.", 503);
    }

    const input = await parseBody(req, createOrderSchema);
    const amount = PLAN_PRICES[input.plan];
    if (!amount) return err("Invalid plan", 400);

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `sub_${session.orgId}_${Date.now()}`,
        notes: {
          orgId: session.orgId,
          plan: input.plan,
          userId: session.user.id,
        },
      }),
    });

    if (!orderRes.ok) {
      const errorData = await orderRes.json().catch(() => ({}));
      return err(`Razorpay order creation failed: ${(errorData as { error?: { description?: string } }).error?.description || "Unknown error"}`, 502);
    }

    const order = await orderRes.json() as { id: string; amount: number; currency: string };

    return ok({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      plan: input.plan,
    });
  });
}

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

type RazorpayPlan = keyof typeof PLAN_PRICES;
function isPlan(value: unknown): value is RazorpayPlan {
  return typeof value === "string" && value in PLAN_PRICES;
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, verifySchema);

    const generated = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET ?? "")
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex");

    let sigValid = false;
    try {
      const a = Buffer.from(generated, "hex");
      const b = Buffer.from(input.razorpay_signature, "hex");
      sigValid = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      sigValid = false;
    }
    if (!sigValid) {
      return err("Payment verification failed: invalid signature", 400);
    }

    const razorpayController = new AbortController();
    const razorpayTimeout = setTimeout(() => razorpayController.abort(), 8000);
    let orderRes: Response;
    try {
      orderRes = await fetch(
        `https://api.razorpay.com/v1/orders/${input.razorpay_order_id}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
          },
          signal: razorpayController.signal,
        }
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return err("Payment verification timed out — please retry", 504);
      }
      return err("Payment verification failed: could not reach payment gateway", 502);
    } finally {
      clearTimeout(razorpayTimeout);
    }
    if (!orderRes.ok) {
      return err("Payment verification failed: could not verify order", 400);
    }
    const order = await orderRes.json() as {
      amount: number;
      notes?: Record<string, unknown> | null;
    };

    const notesPlan = order.notes?.plan;
    const notesOrgId = order.notes?.orgId;
    if (!isPlan(notesPlan)) {
      return err("Payment verification failed: order is missing plan metadata", 400);
    }
    if (notesOrgId !== session.orgId) {
      return err("Payment verification failed: order belongs to another organization", 403);
    }
    const plan: RazorpayPlan = notesPlan;
    const amount = PLAN_PRICES[plan];
    if (order.amount !== amount) {
      return err("Payment verification failed: plan/amount mismatch", 400);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const alreadyRecorded = await db.transaction(async (tx) => {
      const duplicate = await tx.query.subscriptionPayments.findFirst({
        where: eq(subscriptionPayments.razorpayPaymentId, input.razorpay_payment_id),
        columns: { id: true },
      });
      if (duplicate) {
        return true;
      }

      const existing = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.orgId, session.orgId),
        columns: { id: true },
      });

      let subscriptionId: number;
      if (existing) {
        await tx.update(subscriptions).set({
          plan,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        }).where(eq(subscriptions.id, existing.id));
        subscriptionId = existing.id;
      } else {
        const [inserted] = await tx.insert(subscriptions).values({
          orgId: session.orgId,
          plan,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        }).returning({ id: subscriptions.id });
        subscriptionId = inserted.id;
      }

      await tx.insert(subscriptionPayments).values({
        orgId: session.orgId,
        subscriptionId,
        razorpayPaymentId: input.razorpay_payment_id,
        razorpayOrderId: input.razorpay_order_id,
        amount: (amount / 100).toFixed(2),
        currency: "INR",
        status: "captured",
        paidAt: now,
      });

      return false;
    });

    if (alreadyRecorded) {
      return err("Payment already recorded", 400);
    }

    void createAuditLog({
      action: "settings.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetType: "subscription",
      metadata: { plan, paymentId: input.razorpay_payment_id },
    }).catch(() => {});

    return ok({ success: true, plan, status: "ACTIVE" });
  });
}
