

import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { organizationMembers, userSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/get-error-message";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { permissionForRoute } from "@/lib/rbac/route-permissions";
import { checkPermission } from "@/lib/rbac/middleware";
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

const SESSION_CHECK_TTL = 60;

export const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * 500 response that never leaks the underlying error (SQL text, org ids,
 * stack frames) to the browser. The original error is logged with a short
 * errorId that is also returned, so a user report can be matched to the log.
 * Zod errors keep their 400 path.
 */
export function serverError(
  error: unknown,
  ctx: { route: string; orgId?: string },
  message = GENERIC_ERROR,
): NextResponse<never> {
  if (error instanceof z.ZodError) {
    return err(`Validation failed: ${error.issues.map((i) => i.message).join("; ")}`, 400);
  }
  const errorId = crypto.randomUUID().slice(0, 8);
  logger.error(`${ctx.route} failed`, { errorId, ...ctx, error: error instanceof Error ? { message: error.message, stack: error.stack } : error });
  return NextResponse.json({ error: message, errorId }, { status: 500 }) as NextResponse<never>;
}

/**
 * For routes that turn thrown business errors into 400s ("Already checked
 * in"). A plain `throw new Error("...")` keeps its message as a 400; anything
 * else (Drizzle/Postgres errors, TypeErrors) or a message that looks like a
 * raw DB error becomes a logged 500 via serverError.
 */
export function userErrorOr500(
  error: unknown,
  ctx: { route: string; orgId?: string },
  message?: string,
): NextResponse<never> {
  if (
    error instanceof Error &&
    error.constructor === Error &&
    error.message &&
    getErrorMessage(error) === error.message
  ) {
    return err(error.message, 400);
  }
  return serverError(error, ctx, message);
}

/** A request shape the permission check needs (NextRequest satisfies it). */
export interface PermissionCheckRequest {
  method: string;
  nextUrl: { pathname: string };
}

export async function withAuth<T>(
  handler: (session: AuthSession) => Promise<NextResponse<T>>,
  req?: PermissionCheckRequest,
): Promise<NextResponse<T>> {
  // Server-Timing marks (MIYO-0009): auth, session-check, membership, handler.
  let mark = performance.now();
  const timing: string[] = [];
  const lap = (name: string) => {
    const now = performance.now();
    timing.push(`${name};dur=${(now - mark).toFixed(1)}`);
    mark = now;
  };

  const session = (await auth()) as Session | null;
  lap("auth");
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

  if (redis && sessionId) {
    try {
      const revoked = await redis.get<boolean>(`revoked:session:${sessionId}`);
      if (revoked) {
        return NextResponse.json({ error: "Session revoked" } as T, { status: 401 });
      }
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

  // MIYO-0011 (approved by Tarun): a passed revocation check is cached per
  // session for SESSION_CHECK_TTL, so parallel dashboard widget calls do not
  // each query userSessions. Same-instance revocations apply at once via
  // `revoked:session:*`; other instances may lag up to SESSION_CHECK_TTL.
  // ponytail: per-instance cache; move to a shared store if instances multiply.
  const sessionOkKey = sessionId ? `session:ok:${sessionId}:${session.user.id}` : null;
  const sessionRecentlyChecked =
    !!redis && !!sessionOkKey && (await redis.get<boolean>(sessionOkKey).catch(() => null)) === true;

  if (sessionId && !sessionRecentlyChecked) {
    try {
      const sessionRow = await db.query.userSessions.findFirst({
        where: eq(userSessions.id, sessionId),
        columns: { isRevoked: true, userId: true },
      });
      if (sessionRow?.isRevoked || (sessionRow && sessionRow.userId !== session.user.id)) {
        return NextResponse.json({ error: "Session revoked" } as T, { status: 401 });
      }
      if (redis && sessionOkKey) await redis.set(sessionOkKey, true, { ex: SESSION_CHECK_TTL });
    } catch (e) {
      logger.error("withAuth: Postgres revocation check failed; denying (fail closed)", { userId: session.user.id, sessionId, error: e });
      return NextResponse.json({ error: "Session verification unavailable" } as T, { status: 503 });
    }
  }

  lap("session-check");

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

  lap("membership");

  // Fine-grained permissions (QA-0027): a route listed in ROUTE_PERMISSIONS is
  // enforced here, so editing a role's permissions actually changes what its
  // API calls can do.
  if (req) {
    const permission = permissionForRoute(req.nextUrl.pathname, req.method);
    if (permission) {
      const allowed = await checkPermission(db, session.user.id, orgId, session.user.role, permission);
      if (!allowed) {
        return NextResponse.json(
          { error: "You don't have permission for this action.", permission } as T,
          { status: 403 },
        );
      }
    }
  }

  const authSession: AuthSession = Object.assign(session, { orgId, branchId }) as AuthSession;
  try {
    const res = await handler(authSession);
    lap("handler");
    res.headers?.set("Server-Timing", timing.join(", "));
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      const detail = e.issues.map((issue: { path: PropertyKey[]; message: string }) => `${String(issue.path.join?.(".") ?? "body")}: ${issue.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${detail}` }, { status: 400 }) as NextResponse<T>;
    }
    throw e;
  }
}

export async function withAdmin<T>(
  handler: (session: AuthSession) => Promise<NextResponse<T>>,
  req?: PermissionCheckRequest,
): Promise<NextResponse<T>> {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!isAdminOrOwner(role)) {
      return NextResponse.json({ error: "Forbidden" } as T, { status: 403 });
    }
    return handler(session);
  }, req);
}

export const HR_EMAIL_TEMPLATE_ROLES = new Set(["CEO", "HR", "ADMIN"]);

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
  const body = await req.json().catch(() => undefined);
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
    req?: PermissionCheckRequest,
  ): Promise<NextResponse<T>> {
    return withAuth(async (session) => {
      const role = session.user.role as string | undefined;
      if (!role || !(allowed as string[]).includes(role)) {
        return NextResponse.json({ error: "Forbidden" } as T, { status: 403 });
      }
      return handler(session);
    }, req);
  };
}
