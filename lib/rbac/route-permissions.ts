/**
 * Route → permission map (QA-0027).
 *
 * The permission editor under /settings/roles and /settings/permissions was
 * cosmetic: requirePermission was called by exactly one route, so removing a
 * permission from a role changed nothing. Every entry here is enforced for
 * real, in one place (withAuth), for every request that matches.
 *
 * A path is matched with a leading-segment pattern where ":id" stands for one
 * segment. The longest matching pattern wins, so a specific sub-path can
 * require a different permission from its parent.
 */
export interface RoutePermissionRule {
  /** Path pattern, e.g. "/api/hr/leaves" or "/api/hr/employees/:id". */
  pattern: string;
  /** HTTP methods this rule covers; omit for every method. */
  methods?: readonly string[];
  permission: string;
}

export const ROUTE_PERMISSIONS: readonly RoutePermissionRule[] = [
  { pattern: "/api/hr/leaves", methods: ["POST"], permission: "hr:leaves:create" },
  { pattern: "/api/hr/leaves/:id/approve", methods: ["PUT", "PATCH"], permission: "hr:leaves:approve" },
  { pattern: "/api/hr/leaves/:id/reject", methods: ["PUT", "PATCH"], permission: "hr:leaves:approve" },
  { pattern: "/api/hr/employees", methods: ["POST"], permission: "hr:employees:create" },
  { pattern: "/api/hr/employees/onboard", methods: ["POST"], permission: "hr:employees:create" },
  { pattern: "/api/hr/employees/:id", methods: ["PATCH", "PUT"], permission: "hr:employees:update" },
  { pattern: "/api/hr/employees/:id", methods: ["DELETE"], permission: "hr:employees:delete" },
  { pattern: "/api/hr/payrolls", methods: ["POST"], permission: "hr:payroll:manage" },
  { pattern: "/api/hr/payrolls/:id/approve", methods: ["PATCH", "PUT"], permission: "hr:payroll:manage" },
  { pattern: "/api/hr/payrolls/:id/paid", methods: ["PATCH", "PUT"], permission: "hr:payroll:manage" },
  { pattern: "/api/hr/attendance/check-in", methods: ["POST"], permission: "self:attendance" },
  { pattern: "/api/hr/attendance/check-out", methods: ["POST"], permission: "self:attendance" },
];

/** The permission a request must carry, or null when the route is unmapped. */
export function permissionForRoute(pathname: string, method: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const upperMethod = method.toUpperCase();

  let best: RoutePermissionRule | null = null;
  for (const rule of ROUTE_PERMISSIONS) {
    if (rule.methods && !rule.methods.includes(upperMethod)) continue;
    if (!matchesPattern(path, rule.pattern)) continue;
    if (!best || rule.pattern.length > best.pattern.length) best = rule;
  }
  return best?.permission ?? null;
}

function matchesPattern(path: string, pattern: string): boolean {
  const pathParts = path.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return false;
  return patternParts.every(
    (part, i) => part === ":id" || part.toLowerCase() === pathParts[i].toLowerCase(),
  );
}
