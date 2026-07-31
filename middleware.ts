import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  checkRateLimit,
  resolveTier,
  isSuspiciousBot,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

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

const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/hr": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/onboarding": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/payroll": ["CEO", "HR", "BRANCH_HR"],
  "/hr/documents": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/work-logs": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/career-ladders": ["CEO", "HR", "ADMIN", "BRANCH_MANAGER", "BRANCH_HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/holidays": ["CEO", "HR", "ADMIN", "BRANCH_MANAGER", "BRANCH_HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/hr/performance": ["CEO", "HR", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/org-chart": ["CEO", "HR"],
  "/hr/incentives": ["CEO", "HR"],
  "/hr/my-payslips": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/my-assets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/my-bonuses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/leaves": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/expenses": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/attendance": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/hr/helpdesk": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/crm/leads": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/deals": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/targets": ["CEO", "HR", "SALES", "BRANCH_MANAGER"],
  "/crm/reports": ["CEO", "HR"],
  "/crm/clients": ["CEO", "HR", "CUSTOMER_SUPPORT", "SALES"],
  "/digital-marketing": ["CEO", "HR", "DIGITAL_MARKETING"],
  "/projects": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/timesheets": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/support": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/support/inbox": ["CEO", "HR", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "SALES"],
  "/chat": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
  "/sales": ["CEO", "HR", "SALES"],
  "/customer-executive": ["CEO", "HR", "CUSTOMER_SUPPORT"],
  "/marketing": ["CEO", "HR", "DIGITAL_MARKETING"],
  "/settings": ["CEO", "HR"],
  "/settings/roles": ["CEO", "HR"],
  "/settings/branches": ["CEO", "HR"],
  "/billing": ["CEO", "HR"],
  "/billing/invoices": ["CEO", "HR"],
  "/notifications": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING"],
  "/ceo": ["CEO", "HR"],

  "/ai": ["CEO", "HR"],

  "/calendar": ["CEO", "HR", "SALES", "CUSTOMER_SUPPORT", "ENGINEERING", "DESIGN", "VIDEO_EDITOR", "DIGITAL_MARKETING", "BRANCH_MANAGER", "BRANCH_HR"],
};

function startsWithAny(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

function canAccessRoute(pathname: string, role: string): boolean {
  if (role === "CEO") return true;

  const matchingRoutes = Object.keys(ROUTE_ROLE_MAP)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return true;

  return ROUTE_ROLE_MAP[matchingRoutes[0]].includes(role);
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
    if (isSuspiciousBot(ua)) {
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
