

import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { organizationMembers, userSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { isAdminOrOwner } from "@/lib/constants/roles";
import type { Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodSchema } from "zod";

export type AuthSession = Omit<Session, "orgId"> & {
  user: NonNullable<Session["user"]>;

  orgId: string;

  branchId: number | null;
};

interface UserSessionRedisCache {
  isActive: boolean | null;
  hasDashboardAccess: boolean | null;
  isPasswordChangeRequired: boolean | null;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  role: string | null;
  orgId: string | null;
  branchId: number | null;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400): NextResponse<never> {
  return NextResponse.json({ error: message }, { status }) as NextResponse<never>;
}

export async function withAuth<T>(
  handler: (session: AuthSession) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" } as T, { status: 401 });
  }

  if ((session as { mfaSatisfied?: boolean }).mfaSatisfied === false) {
    return NextResponse.json({ error: "MFA verification required", mfaRequired: true } as T, { status: 403 });
  }

  let orgId: string | null | undefined = session.orgId;
  let branchId: number | null = (session as { branchId?: number | null }).branchId ?? null;

  const sessionId = (session as { sessionId?: string }).sessionId;

  if (session.user.isActive === false) {
    return NextResponse.json({ error: "Account deactivated" } as T, { status: 403 });
  }

  let revocationConfirmed = false;
  if (redis && sessionId) {
    try {
      const revoked = await redis.get<boolean>(`revoked:session:${sessionId}`);
      if (revoked) {
        return NextResponse.json({ error: "Session revoked" } as T, { status: 401 });
      }
      revocationConfirmed = true;
    } catch (e) {
      logger.error("withAuth: redis revocation check failed; falling back to Postgres", { sessionId, error: e });
    }
  }

  if (redis) {
    try {
      const cached = await redis.get<UserSessionRedisCache>(`user:session:${session.user.id}`);
      if (cached !== null) {

        if (cached.isActive === false) {
          return NextResponse.json({ error: "Account deactivated" } as T, { status: 403 });
        }

        session.user.role = (cached.role ?? session.user.role) as typeof session.user.role;
        session.user.name = cached.name ?? session.user.name;
        session.user.image = cached.image ?? session.user.image;
        session.user.forceChangePassword = cached.isPasswordChangeRequired ?? session.user.forceChangePassword;

        if (cached.orgId != null) orgId = cached.orgId;
        if (cached.branchId != null) branchId = cached.branchId;
      }

    } catch (e) {
      logger.error("withAuth: session cache read failed (continuing with JWT/Postgres data)", { userId: session.user.id, error: e });
    }
  }

  if (!revocationConfirmed && sessionId) {
    try {
      const sessionRow = await db.query.userSessions.findFirst({
        where: eq(userSessions.id, sessionId),
        columns: { isRevoked: true, userId: true },
      });
      if (sessionRow?.isRevoked || (sessionRow && sessionRow.userId !== session.user.id)) {
        return NextResponse.json({ error: "Session revoked" } as T, { status: 401 });
      }
    } catch (e) {
      logger.error("withAuth: Postgres revocation check failed; denying (fail closed)", { userId: session.user.id, sessionId, error: e });
      return NextResponse.json({ error: "Session verification unavailable" } as T, { status: 503 });
    }
  }

  if (!orgId) {
    try {
      const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id),
        columns: { orgId: true },
      });
      orgId = member?.orgId ?? null;
    } catch (e) {
      logger.error("withAuth: organization membership lookup failed", { userId: session.user.id, error: e });
      return NextResponse.json({ error: "Failed to resolve organization" } as T, { status: 500 });
    }
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" } as T, { status: 403 });
  }

  const authSession: AuthSession = Object.assign(session, { orgId, branchId }) as AuthSession;
  try {
    return await handler(authSession);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const detail = e.issues.map((issue: { path: PropertyKey[]; message: string }) => `${String(issue.path.join?.(".") ?? "body")}: ${issue.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${detail}` }, { status: 400 }) as NextResponse<T>;
    }
    throw e;
  }
}

export async function withAdmin<T>(
  handler: (session: AuthSession) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!isAdminOrOwner(role)) {
      return NextResponse.json({ error: "Forbidden" } as T, { status: 403 });
    }
    return handler(session);
  });
}

export const HR_EMAIL_TEMPLATE_ROLES = new Set(["CEO", "HR", "ADMIN", "BRANCH_HR"]);

export async function withHrEmailTemplateAccess<T>(
  handler: (session: AuthSession) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!role || !HR_EMAIL_TEMPLATE_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" } as T, { status: 403 });
    }
    return handler(session);
  });
}

export function parseQuery<T>(req: NextRequest, schema: ZodSchema<T>): T {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(raw);
}

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

export function toNumber(val: string | null | undefined): number | undefined {
  if (val == null || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

export function toBool(val: string | null | undefined): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  return val === "true" || val === "1";
}

/**
 * Role-gated variant of withAuth.
 * Eliminates 40+ inline role-check strings in API routes.
 *
 * @example
 * export const POST = withRoles([ROLES.CEO, ROLES.HR])(async (session) => { ... });
 */
export function withRoles<T>(allowed: readonly string[]) {
  return function (
    handler: (session: AuthSession) => Promise<NextResponse<T>>,
  ): Promise<NextResponse<T>> {
    return withAuth(async (session) => {
      const role = session.user.role as string | undefined;
      if (!role || !(allowed as string[]).includes(role)) {
        return NextResponse.json({ error: "Forbidden" } as T, { status: 403 });
      }
      return handler(session);
    });
  };
}
