"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Info, CheckCircle2, XCircle, Lock } from "lucide-react";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, SYSTEM_ROLES } from "@/lib/rbac/permissions";
import type { SystemRole } from "@/lib/rbac/permissions";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<SystemRole, string> = {
  CEO: "CEO",
  HR: "HR",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Support",
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "DM",
  BRANCH_MANAGER: "Branch Mgr",
  BRANCH_HR: "Branch HR",
};

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
    for (const r of SYSTEM_ROLES) {
      result[r] = new Set(ROLE_DEFAULT_PERMISSIONS[r] ?? []);
    }
    return result;
  }, []);

  return (
    <PageWrapper
      title="Permission Matrix"
      subtitle="Read-only overview of built-in permissions per system role"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Permissions are defined by system role. To assign custom permissions to a specific
            user, create a custom role in{" "}
            <Link href="/settings/roles" className="underline underline-offset-2 font-medium">
              Roles &amp; Permissions
            </Link>
            . Contact your system administrator to change role assignments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SYSTEM_ROLES.map((r) => (
            <Badge
              key={r}
              variant={r === role ? "default" : "outline"}
              className={cn(
                "text-[11px]",
                r === role && "bg-primary text-primary-foreground"
              )}
            >
              {ROLE_LABELS[r]}
            </Badge>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-gold" />
              System Role Permissions ({PERMISSIONS.length} total)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[900px]">
                <div className="grid bg-muted/50 border-b border-border/40 sticky top-0 z-10"
                  style={{ gridTemplateColumns: `260px repeat(${SYSTEM_ROLES.length}, minmax(72px, 1fr))` }}
                >
                  <div className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Permission
                  </div>
                  {SYSTEM_ROLES.map((r) => (
                    <div
                      key={r}
                      className={cn(
                        "px-2 py-2.5 text-center text-[11px] font-semibold leading-tight text-muted-foreground",
                        r === role && "text-primary"
                      )}
                    >
                      {ROLE_LABELS[r]}
                    </div>
                  ))}
                </div>

                {permissionGroups.map(([resource, perms]) => (
                  <div key={resource}>
                    <div
                      className="grid bg-muted/20 border-b border-border/30"
                      style={{ gridTemplateColumns: `260px repeat(${SYSTEM_ROLES.length}, minmax(72px, 1fr))` }}
                    >
                      <div className="px-4 py-1.5 col-span-full text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {formatResource(resource)}
                      </div>
                    </div>

                    {perms.map((perm) => (
                      <PermissionRow
                        key={perm.name}
                        perm={perm}
                        roleCount={SYSTEM_ROLES.length}
                        rolePermSets={rolePermSets}
                        currentRole={role}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

interface PermissionRowProps {
  perm: (typeof PERMISSIONS)[number];
  roleCount: number;
  rolePermSets: Record<string, Set<string>>;
  currentRole: SystemRole | undefined;
}

function PermissionRow({ perm, roleCount, rolePermSets, currentRole }: PermissionRowProps) {
  return (
    <div
      className="grid border-b border-border/20 hover:bg-muted/10 transition-colors"
      style={{ gridTemplateColumns: `260px repeat(${roleCount}, minmax(72px, 1fr))` }}
    >
      <div className="px-4 py-2 flex flex-col justify-center">
        <p className="text-[12px] font-medium leading-snug">{perm.description}</p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {formatAction(perm.action)}
        </p>
      </div>

      {SYSTEM_ROLES.map((r) => {
        const hasPermission = r === "CEO" || (rolePermSets[r]?.has(perm.name) ?? false);
        return (
          <div
            key={r}
            className={cn(
              "flex items-center justify-center py-2",
              r === currentRole && "bg-primary/5"
            )}
          >
            {hasPermission ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Allowed" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground/30" aria-label="Not allowed" />
            )}
          </div>
        );
      })}
    </div>
  );
}
