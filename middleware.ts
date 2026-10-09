import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  checkRateLimit,
  resolveTier,
  isSuspiciousBot,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { canAccessRoute } from "@/lib/auth/route-access";
import { isSignupEnabled } from "@/lib/auth/signup-enabled";

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

function authJsSessionCookieName(req: NextRequest): string {
  if (process.env.NODE_ENV !== "production") {
    return "authjs.session-token";
  }
  const forwarded = req.headers.get("x-forwarded-proto");
  const isHttps = forwarded === "https" || req.nextUrl.protocol === "https:";
  return isHttps ? "__Secure-authjs.session-token" : "authjs.session-token";
}

const PROTECTED_ROUTES = [
  "/dashboard",
  "/projects",
  "/hr",
  "/settings",
  "/onboarding",
  "/ceo",
  "/sales",
  "/customer-executive",
  "/billing",
  "/timesheets",
  "/support",
  "/crm",
  "/chat",
  "/digital-marketing",
  "/reports",
  "/notifications",
  "/marketing",
  "/ai",
  "/calendar",
];

const AUTH_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/setup-password",
  "/verify-email",
];

const ALLOW_AUTHENTICATED = [
  "/invitation",
  "/reset-password",
  "/setup-password",
];

function startsWithAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

const BOT_BLOCKED_PREFIXES = [
  "/api/auth/",
  "/api/trpc/auth.",
  "/api/trpc/organization.",
  "/api/chat",
  "/api/ai/",
  "/api/storage/",
  "/api/expenses/",
];

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const tier = resolveTier(pathname);
  if (tier) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const result = await checkRateLimit(tier, ip);

    if (!result.allowed) {
      logger.warn("Rate limit exceeded", { ip, path: pathname, tier, retryAfterSecs: result.retryAfterSecs });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSecs),
          },
        },
      );
    }
  }

  if (BOT_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const ua = req.headers.get("user-agent");
    if (isSuspiciousBot(ua, { allowEmpty: process.env.NODE_ENV !== "production" })) {
      logger.warn("Blocked suspicious bot", {
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
        path: pathname,
        userAgent: ua?.slice(0, 200),
      });
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }
  }

  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http" &&
    !isLoopbackHostname(req.nextUrl.hostname)
  ) {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = "https";
    return NextResponse.redirect(httpsUrl, 301);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if ((pathname === "/signup" || pathname.startsWith("/signup/")) && !isSignupEnabled()) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: authJsSessionCookieName(req),
  });

  const isAuthenticated = !!token;
  if (!isAuthenticated && startsWithAny(pathname, PROTECTED_ROUTES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (
    isAuthenticated &&
    startsWithAny(pathname, AUTH_ROUTES) &&
    !startsWithAny(pathname, ALLOW_AUTHENTICATED)
  ) {
    const callbackUrl = searchParams.get("callbackUrl");
    const url = req.nextUrl.clone();
    const isSafeRedirect =
      callbackUrl &&
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.includes("\\");
    url.pathname = isSafeRedirect ? callbackUrl : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (
    isAuthenticated &&
    token?.isActive !== undefined &&
    token.isActive === false &&
    !pathname.startsWith("/api/auth/signout")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signout";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (
    isAuthenticated &&
    token?.forceChangePassword &&
    !pathname.startsWith("/reset-password") &&
    !pathname.startsWith("/api/auth/signout") &&
    !pathname.startsWith("/api/storage/upload")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/reset-password";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (
    isAuthenticated &&
    pathname.startsWith("/reset-password") &&
    !token?.forceChangePassword &&
    !searchParams.get("token")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.mfaEnforced &&
    !token?.totpEnabled &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/auth/mfa/")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/settings";
    url.search = "?tab=security&mfa=required";
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.totpEnabled &&
    token?.mfaSatisfied !== true &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/mfa")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/mfa";
    url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.orgId === null &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/onboarding")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    isAuthenticated &&
    token?.onboardingCompleted === false &&
    startsWithAny(pathname, PROTECTED_ROUTES) &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/auth/signout")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && token?.orgId && redis) {
    try {
      const allowlistRaw = await redis.get<string>(`org:ip-allowlist:${token.orgId as string}`);
      if (allowlistRaw) {
        const allowlist: string[] = typeof allowlistRaw === "string"
          ? (JSON.parse(allowlistRaw) as string[])
          : (allowlistRaw as unknown as string[]);
        if (allowlist.length > 0) {
          const clientIp =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
          const allowed = allowlist.some((entry) => clientIp === entry);
          if (!allowed) {
            logger.warn("IP not in org allowlist", { ip: clientIp, orgId: token.orgId });
            return NextResponse.json(
              { error: "Access denied: your IP is not permitted for this organization." },
              { status: 403 }
            );
          }
        }
      }
    } catch {
      logger.warn("IP allowlist check failed; allowing request", { orgId: token.orgId });
    }
  }

  if (isAuthenticated && token?.role && startsWithAny(pathname, PROTECTED_ROUTES)) {
    const userRole = token.role as string;
    if (!canAccessRoute(pathname, userRole)) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
