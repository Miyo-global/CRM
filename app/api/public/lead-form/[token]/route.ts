
import { db } from "@/lib/db";
import { webLeadForms, leads } from "@/lib/db/schema/crm";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api/helpers";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";

const leadFormBodySchema = z.record(z.string(), z.unknown());

type Params = { params: Promise<{ token: string }> };

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const [form] = await db
    .select({
      name: webLeadForms.name,
      fields: webLeadForms.fields,
      submitMessage: webLeadForms.submitMessage,
      redirectUrl: webLeadForms.redirectUrl,
      isActive: webLeadForms.isActive,
    })
    .from(webLeadForms)
    .where(eq(webLeadForms.publicToken, token));

  if (!form || !form.isActive) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ form });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const rl = await checkRateLimitRedis("public-intake", getClientIp(req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const [form] = await db
    .select()
    .from(webLeadForms)
    .where(eq(webLeadForms.publicToken, token));

  if (!form || !form.isActive) {
    return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
  }

  let body: z.infer<typeof leadFormBodySchema>;
  try {
    body = await parseBody(req, leadFormBodySchema);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const fields = (form.fields ?? []) as Array<{ name: string; label: string; required: boolean }>;
  for (const field of fields) {
    const val = body[field.name];
    if (field.required && (val === undefined || val === null || val === "")) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    }
  }

  const strField = (key: string, maxLen = 500): string | null => {
    const val = body[key];
    return typeof val === "string" && val.length > 0 ? val.slice(0, maxLen) : null;
  };

  const emailVal = strField("email", 320);
  if (emailVal && !z.string().email().safeParse(emailVal).success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const leadName =
    strField("name") ??
    strField("full_name") ??
    (strField("first_name")
      ? `${strField("first_name") ?? ""}${strField("last_name") ? " " + strField("last_name") : ""}`.trim()
      : null) ??
    "Unknown";

  const leadNotes = strField("message") ?? strField("notes");

  const customData: Record<string, string> = {};
  for (const field of fields) {
    const val = body[field.name];
    if (typeof val === "string" && val.length > 0) {
      customData[field.name] = val.slice(0, 2000);
    } else if (typeof val === "number" || typeof val === "boolean") {
      customData[field.name] = String(val).slice(0, 2000);
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(leads).values({
      orgId: form.orgId,
      name: leadName.slice(0, 255),
      email: emailVal,
      phone: strField("phone", 50),
      company: strField("company", 255),
      notes: leadNotes,
      source: "website",
      customData,
    });

    await tx
      .update(webLeadForms)
      .set({
        totalSubmissions: sql`${webLeadForms.totalSubmissions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(webLeadForms.id, form.id));
  });

  return NextResponse.json({
    success: true,
    message: form.submitMessage ?? "Thank you! We'll be in touch soon.",
    redirectUrl: form.redirectUrl ?? null,
  });
}
