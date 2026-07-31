"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useUpdateRole } from "@/lib/api/hooks/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Permission } from "@/lib/rbac/permissions";
import type { Role } from "@/types/organization";


function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}


interface PermissionRowProps {
  perm: Permission;
  enabled: boolean;
  isCEO: boolean;
  onToggle: (name: string) => void;
}

function PermissionRow({ perm, enabled, isCEO, onToggle }: PermissionRowProps) {
  const handleToggle = useCallback(() => onToggle(perm.name), [perm.name, onToggle]);

  return (
    <div className="flex items-center justify-between px-4 pl-10 py-2 hover:bg-muted/20 transition-colors">
      <div>
        <p className="text-[13px]">{perm.description}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{perm.name}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isCEO} className="h-4 w-7" />
    </div>
  );
}


interface PermissionGroupRowProps {
  groupName: string;
  perms: Permission[];
  isExpanded: boolean;
  enabledCount: number;
  isCEO: boolean;
  rolePermissions: Set<string>;
  onToggleGroup: (name: string) => void;
  onToggleAll: (perms: Permission[], enable: boolean) => void;
  onTogglePermission: (name: string) => void;
}

function PermissionGroupRow({ groupName, perms, isExpanded, enabledCount, isCEO, rolePermissions, onToggleGroup, onToggleAll, onTogglePermission }: PermissionGroupRowProps) {
  const allEnabled = enabledCount === perms.length;
  const handleToggleGroup = useCallback(() => onToggleGroup(groupName), [groupName, onToggleGroup]);
  const handleToggleAll = useCallback((v: boolean) => onToggleAll(perms, v), [perms, onToggleAll]);
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <div>
      <button onClick={handleToggleGroup} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-sm font-medium">{groupName}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{enabledCount}/{perms.length}</Badge>
        </div>
        {!isCEO && (
          <Switch checked={allEnabled} onCheckedChange={handleToggleAll} onClick={handleStopPropagation} className="h-4 w-7" />
        )}
      </button>
      {isExpanded && (
        <div className="bg-muted/10 border-t border-border/20">
          {perms.map((perm) => (
            <PermissionRow
              key={perm.name}
              perm={perm}
              enabled={isCEO || rolePermissions.has(perm.name)}
              isCEO={isCEO}
              onToggle={onTogglePermission}
            />
          ))}
        </div>
      )}
    </div>
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

  const togglePermission = (permName: string) => {
    const current = new Set(role.permissions ?? []);
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
          onUpdate({ ...role, permissions: newPermissions });
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
    const current = new Set(role.permissions ?? []);
    for (const p of perms) {
      if (enable) current.add(p.name);
      else current.delete(p.name);
    }
    const newPermissions = Array.from(current);
    updateRole.mutate(
      { id: role.id, permissions: newPermissions },
      {
        onSuccess: () => {
          onUpdate({ ...role, permissions: newPermissions });
          toast.success("Permissions updated");
        },
      }
    );
  };

  const isCEO = role.slug === "CEO";

  return (
    <Card className="flex flex-col lg:min-h-0 lg:h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {role.name}
              {role.isSystem && <Badge variant="outline" className="text-[10px]">System Role</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rolePermissions.size} of {PERMISSIONS.length} permissions enabled
            </p>
          </div>
          {updateRole.isPending && <SpinnerIcon className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <Separator />
      <ScrollArea className="max-h-[65vh] lg:max-h-none lg:flex-1 lg:min-h-0" type="auto">
        <div className="divide-y divide-border/30">
          {permissionGroups.map(([groupName, perms]) => (
            <PermissionGroupRow
              key={groupName}
              groupName={groupName}
              perms={perms}
              isExpanded={expandedGroups.has(groupName)}
              enabledCount={perms.filter((p) => rolePermissions.has(p.name)).length}
              isCEO={isCEO}
              rolePermissions={rolePermissions}
              onToggleGroup={toggleGroup}
              onToggleAll={toggleAllInGroup}
              onTogglePermission={togglePermission}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
