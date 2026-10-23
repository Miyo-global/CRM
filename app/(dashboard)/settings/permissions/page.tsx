"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Info, CheckCircle2, XCircle, Lock } from "lucide-react";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";
import type { SystemRole } from "@/lib/rbac/permissions";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ACTIVE_SYSTEM_ROLES, ROLE_LABELS } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils";



function groupByResource(permissions: typeof PERMISSIONS) {
  const groups: Record<string, typeof PERMISSIONS> = {};
  for (const perm of permissions) {
    const key = perm.resource;
    if (!groups[key]) groups[key] = [];
    groups[key].push(perm);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function formatResource(resource: string) {
  return resource
    .replace(/:/g, " › ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PermissionsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <PermissionsContent />
    </DashboardGate>
  );
}

function PermissionsContent() {
  const { data: session } = useSession();
  const role = session?.user?.role as SystemRole | undefined;

  const permissionGroups = useMemo(() => groupByResource(PERMISSIONS), []);

  const rolePermSets = useMemo(() => {
    const result: Record<string, Set<string>> = {};
    for (const r of ACTIVE_SYSTEM_ROLES) {
      result[r] = new Set(ROLE_DEFAULT_PERMISSIONS[r] ?? []);
    }
    return result;
  }, []);

  const [hoverRole, setHoverRole] = useState<SystemRole | null>(null);
  const clearHover = useCallback(() => setHoverRole(null), []);
  const colTone = (r: SystemRole) =>
    r === hoverRole ? "bg-accent" : r === role ? "bg-brand-soft/50" : undefined;

  return (
    <PageWrapper
      title="Permission matrix"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-info-soft bg-info-soft p-3 text-sm text-info-strong">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Permissions are defined by system role. To assign custom permissions to a specific
            user, create a custom role in{" "}
            <Link href="/settings/roles" className="underline underline-offset-2 font-medium">
              Roles &amp; Permissions
            </Link>
            . Contact your system administrator to change role assignments.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-sunken p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Leave, employee, payroll and attendance actions are checked against these
            permissions on every request. Other modules are still governed by the
            coarse system role shown on each page.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ACTIVE_SYSTEM_ROLES.map((r) => (
            <StatusPill key={r} tone={r === role ? "brand" : "neutral"} dot={r === role}>
              {ROLE_LABELS[r]}
            </StatusPill>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Lock className="size-4 text-brand-text" aria-hidden />
            <h2 className="text-sm font-semibold">
              System Role Permissions <span className="tabular-nums text-muted-foreground">({PERMISSIONS.length} total)</span>
            </h2>
          </div>
          <div className="max-h-[70vh] overflow-auto" onMouseLeave={clearHover}>
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-sticky">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-sticky w-64 border-b border-border bg-surface-sunken px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Permission
                  </th>
                  {ACTIVE_SYSTEM_ROLES.map((r) => (
                    <th
                      key={r}
                      scope="col"
                      onMouseEnter={() => setHoverRole(r)}
                      className={cn(
                        "min-w-18 border-b border-border bg-surface-sunken px-2 py-2.5 text-center text-2xs font-semibold leading-tight text-muted-foreground transition-colors",
                        r === role && "text-brand-text",
                        r === hoverRole && "bg-accent text-foreground"
                      )}
                    >
                      {ROLE_LABELS[r]}
                    </th>
                  ))}
                </tr>
              </thead>

              {permissionGroups.map(([resource, perms]) => (
                <tbody key={resource}>
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={ACTIVE_SYSTEM_ROLES.length + 1}
                      className="border-b border-border bg-surface-sunken p-0 text-left"
                    >
                      <span className="sticky left-0 inline-block px-4 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {formatResource(resource)}
                      </span>
                    </th>
                  </tr>

                  {perms.map((perm) => (
                    <PermissionRow
                      key={perm.name}
                      perm={perm}
                      rolePermSets={rolePermSets}
                      onHoverRole={setHoverRole}
                      colTone={colTone}
                    />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}

interface PermissionRowProps {
  perm: (typeof PERMISSIONS)[number];
  rolePermSets: Record<string, Set<string>>;
  onHoverRole: (r: SystemRole) => void;
  colTone: (r: SystemRole) => string | undefined;
}

function PermissionRow({ perm, rolePermSets, onHoverRole, colTone }: PermissionRowProps) {
  return (
    <tr className="group/row">
      <th
        scope="row"
        className="sticky left-0 z-base border-b border-border bg-card px-4 py-2 text-left font-normal group-hover/row:bg-accent"
      >
        <p className="text-xs font-medium leading-snug">{perm.description}</p>
        <p className="text-2xs text-muted-foreground font-mono mt-0.5">
          {formatAction(perm.action)}
        </p>
      </th>

      {ACTIVE_SYSTEM_ROLES.map((r) => {
        const hasPermission = r === "CEO" || (rolePermSets[r]?.has(perm.name) ?? false);
        return (
          <td
            key={r}
            onMouseEnter={() => onHoverRole(r)}
            className={cn(
              "border-b border-border py-2 text-center align-middle transition-colors group-hover/row:bg-accent/60",
              colTone(r)
            )}
          >
            {hasPermission ? (
              <CheckCircle2 className="inline-block size-4 text-success-strong" aria-label="Allowed" />
            ) : (
              <XCircle className="inline-block size-3.5 text-subtle-foreground/50" aria-label="Not allowed" />
            )}
          </td>
        );
      })}
    </tr>
  );
}
