import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeItems, projects } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";
import { verifyTurnstile } from "@/lib/security/turnstile";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

const intakeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  submitterEmail: z.string().trim().email().optional(),
  // MIYO-0130: Cloudflare Turnstile response from the form.
  turnstileToken: z.string().max(4000).optional(),
}).strict();

function sanitizeText(text: string): string {
  return text.replace(/^[=+\-@\t\r]+/, "");
}

type RouteParams = { params: Promise<{ token: string }> };

const CLOSED = "This form is closed or the link is wrong";

async function projectForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const [project] = await db
    .select({ id: projects.id, orgId: projects.orgId, name: projects.name })
    .from(projects)
    .where(and(eq(projects.intakeToken, token), isNull(projects.deletedAt), isNull(projects.archivedAt)));
  return project ?? null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  const project = await projectForToken(token);
  if (!project) return NextResponse.json({ error: CLOSED }, { status: 404 });
  return NextResponse.json({ projectName: project.name });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const rl = await checkRateLimitRedis("public-intake", getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { token } = await params;
  const project = await projectForToken(token);
  if (!project) return NextResponse.json({ error: CLOSED }, { status: 404 });

  const body = await request.json().catch(() => undefined);
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || undefined;
    return NextResponse.json({ error: "Validation failed", field }, { status: 400 });
  }

  // MIYO-0130: anyone with the link can post here, so the form carries a
  // Turnstile token.
  const bot = await verifyTurnstile(parsed.data.turnstileToken, getClientIp(request));
  if (!bot.ok) {
    return NextResponse.json(
      { error: "We couldn't confirm you are human. Reload the page and try again." },
      { status: 400 },
    );
  }

  const description = parsed.data.description ? sanitizeText(parsed.data.description) : undefined;
  const [item] = await db
    .insert(intakeItems)
    .values({
      projectId: project.id,
      orgId: project.orgId,
      title: sanitizeText(parsed.data.title),
      description: description
        ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] }
        : null,
      source: "web_form",
      submitterEmail: parsed.data.submitterEmail,
    })
    .returning({ id: intakeItems.id });

  return NextResponse.json({ id: item.id, message: "Request submitted" }, { status: 201 });
}
