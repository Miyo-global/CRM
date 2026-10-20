"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "sonner";
import { useUpdateRole } from "@/lib/api/hooks/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Permission } from "@/lib/rbac/permissions";
import type { Role } from "@/types/organization";


interface PermissionRowProps {
  perm: Permission;
  enabled: boolean;
  isCEO: boolean;
  onToggle: (name: string) => void;
}

function PermissionRow({ perm, enabled, isCEO, onToggle }: PermissionRowProps) {
  const handleToggle = useCallback(() => onToggle(perm.name), [perm.name, onToggle]);

  return (
    <tr className="group/row border-b border-border transition-colors hover:bg-accent/60">
      <th scope="row" className="sticky left-0 z-base bg-card py-2 pl-10 pr-4 text-left font-normal group-hover/row:bg-accent">
        <p className="text-sm">{perm.description}</p>
        <p className="font-mono text-2xs text-muted-foreground">{perm.name}</p>
      </th>
      <td className="w-28 px-3 py-2 text-center hover:bg-brand-soft/60">
        <Checkbox
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isCEO}
          aria-label={perm.description}
          className="align-middle"
        />
      </td>
    </tr>
  );
}


interface PermissionGroupRowProps {
  groupName: string;
  perms: Permission[];
  isExpanded: boolean;
  enabledCount: number;
  isCEO: boolean;
  builtIn: Set<string>;
  rolePermissions: Set<string>;
  onToggleGroup: (name: string) => void;
  onToggleAll: (perms: Permission[], enable: boolean) => void;
  onTogglePermission: (name: string) => void;
}

function PermissionGroupRow({ groupName, perms, isExpanded, enabledCount, isCEO, builtIn, rolePermissions, onToggleGroup, onToggleAll, onTogglePermission }: PermissionGroupRowProps) {
  const allEnabled = enabledCount === perms.length;
  const someEnabled = enabledCount > 0 && !allEnabled;
  const handleToggleGroup = useCallback(() => onToggleGroup(groupName), [groupName, onToggleGroup]);
  const handleToggleAll = useCallback((v: boolean | "indeterminate") => onToggleAll(perms, v === true), [perms, onToggleAll]);
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <tbody>
      <tr className="border-b border-border bg-surface-sunken">
        <th scope="rowgroup" className="sticky left-0 z-base bg-surface-sunken p-0 text-left font-normal">
          <button
            type="button"
            onClick={handleToggleGroup}
            aria-expanded={isExpanded}
            className="flex w-full items-center gap-2 px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:focus-ring"
          >
            <Chevron className="size-3.5 shrink-0" aria-hidden />
            <span>{groupName}</span>
            <span className="rounded-full bg-card px-1.5 py-px text-3xs tabular-nums text-muted-foreground ring-1 ring-border ring-inset">
              {enabledCount}/{perms.length}
            </span>
          </button>
        </th>
        <td className="w-28 px-3 py-2 text-center">
          {!isCEO && (
            <Checkbox
              checked={allEnabled ? true : someEnabled ? "indeterminate" : false}
              onCheckedChange={handleToggleAll}
              aria-label={`Toggle all ${groupName} permissions`}
              className="align-middle"
            />
          )}
        </td>
      </tr>
      {isExpanded &&
        perms.map((perm) => (
          <PermissionRow
            key={perm.name}
            perm={perm}
            enabled={isCEO || rolePermissions.has(perm.name)}
            isCEO={isCEO || builtIn.has(perm.name)}
            onToggle={onTogglePermission}
          />
        ))}
    </tbody>
  );
}


interface PermissionMatrixProps {
  role: Role;
  permissionGroups: [string, Permission[]][];
  onUpdate: (updated: Role) => void;
}

export function PermissionMatrix({ role, permissionGroups, onUpdate }: PermissionMatrixProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const updateRole = useUpdateRole();

  const rolePermissions = new Set(role.permissions ?? []);
  // A system role's defaults are always held; only additions are stored and
  // toggled, so a checkbox never claims to remove what the code still grants.
  const builtIn = new Set(role.defaultPermissions ?? []);
  const storedAdditions = () => new Set((role.permissions ?? []).filter((name) => !builtIn.has(name)));
  const withBuiltIn = (stored: string[]) => [...new Set([...builtIn, ...stored])];

  const togglePermission = (permName: string) => {
    if (builtIn.has(permName)) return;
    const current = storedAdditions();
    if (current.has(permName)) {
      current.delete(permName);
    } else {
      current.add(permName);
    }
    const newPermissions = Array.from(current);
    updateRole.mutate(
      { id: role.id, permissions: newPermissions },
      {
        onSuccess: () => {
          onUpdate({ ...role, permissions: withBuiltIn(newPermissions) });
          toast.success("Permissions updated");
        },
      }
    );
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const toggleAllInGroup = (perms: Permission[], enable: boolean) => {
    const current = storedAdditions();
    for (const p of perms) {
      if (builtIn.has(p.name)) continue;
      if (enable) current.add(p.name);
      else current.delete(p.name);
    }
    const newPermissions = Array.from(current);
    updateRole.mutate(
      { id: role.id, permissions: newPermissions },
      {
        onSuccess: () => {
          onUpdate({ ...role, permissions: withBuiltIn(newPermissions) });
          toast.success("Permissions updated");
        },
      }
    );
  };

  const isCEO = role.slug === "CEO";

  return (
    <Card className="flex flex-col overflow-hidden lg:min-h-0 lg:h-full">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {role.name}
            {role.isSystem && <StatusPill tone="neutral">System Role</StatusPill>}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {rolePermissions.size} of {PERMISSIONS.length} permissions enabled
          </p>
        </div>
        {updateRole.isPending && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Saving" />
        )}
      </div>
      <div className="max-h-[65vh] overflow-auto lg:max-h-none lg:min-h-0 lg:flex-1">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-sticky bg-surface-sunken">
            <tr>
              <th scope="col" className="sticky left-0 z-sticky h-9 border-b border-border bg-surface-sunken px-4 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permission
              </th>
              <th scope="col" className="h-9 w-28 border-b border-border px-3 text-center text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Enabled
              </th>
            </tr>
          </thead>
          {permissionGroups.map(([groupName, perms]) => (
            <PermissionGroupRow
              key={groupName}
              groupName={groupName}
              perms={perms}
              isExpanded={expandedGroups.has(groupName)}
              builtIn={builtIn}
              enabledCount={perms.filter((p) => rolePermissions.has(p.name)).length}
              isCEO={isCEO}
              rolePermissions={rolePermissions}
              onToggleGroup={toggleGroup}
              onToggleAll={toggleAllInGroup}
              onTogglePermission={togglePermission}
            />
          ))}
        </table>
      </div>
    </Card>
  );
}
