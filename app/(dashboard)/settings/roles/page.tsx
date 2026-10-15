"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useRoles,
  useDeleteRole,
} from "@/lib/api/hooks/roles";
import {
  Plus,
  Trash2,
  Shield,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Permission } from "@/lib/rbac/permissions";
import type { Role } from "@/types/organization";
import { PermissionMatrix } from "@/features/settings/roles/permission-matrix";
import { CreateRoleDialog, RoleTemplateDialog } from "@/features/settings/roles/role-dialogs";

const RESOURCE_GROUPS: Record<string, string> = {
  "hr:employees": "HR - Employees",
  "hr:attendance": "HR - Attendance",
  "hr:leaves": "HR - Leaves",
  "hr:payroll": "HR - Payroll",
  "hr:salary": "HR - Salary",
  "hr:expenses": "HR - Expenses",
  "hr:assets": "HR - Assets",
  "hr:documents": "HR - Documents",
  "hr:performance": "HR - Performance",
  "hr:goals": "HR - Goals",
  "projects": "Projects",
  "projects:tickets": "Project Tickets",
  "projects:sprints": "Project Sprints",
  "projects:timesheets": "Timesheets",
  "reports": "Reports",
  "settings": "Settings",
  "settings:rbac": "RBAC Management",
  "crm:leads": "CRM - Leads",
  "crm:targets": "CRM - Targets",
  "crm:reports": "CRM - Reports",
  "dashboard:sales": "Dashboard - Sales",
  "dashboard:customer-executive": "Dashboard - Customer Executive",
  "dashboard:support": "Dashboard - Support",
  "self": "Self-Service",
};

function groupPermissions(permissions: Permission[]) {
  const groups: Record<string, Permission[]> = {};
  for (const perm of permissions) {
    const group = RESOURCE_GROUPS[perm.resource] || perm.resource;
    if (!groups[group]) groups[group] = [];
    groups[group].push(perm);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function RolesPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <RolesContent />
    </DashboardGate>
  );
}

function RolesContent() {
  const { data: roles, isLoading } = useRoles();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const deleteRole = useDeleteRole();

  const handleDeleteRole = () => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (selectedRole?.id === deleteTarget.id) setSelectedRole(null);
        toast.success("Role deleted");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const permissionGroups = useMemo(() => groupPermissions(PERMISSIONS), []);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleUpdateRole = useCallback((updated: Role) => setSelectedRole(updated), []);
  const handleDeleteDialogClose = useCallback(() => setDeleteTarget(null), []);

  return (
    <PageWrapper
      title="Roles & Permissions"
      subtitle="Configure access controls for each role"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)}>
            <Copy aria-hidden /> Use Template
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus aria-hidden /> New Role
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:h-full lg:min-h-0">
        <Card className="flex flex-col overflow-hidden lg:min-h-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Shield className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">Roles</h2>
            <span className="ml-auto inline-flex h-5 items-center rounded-full bg-neutral-soft px-2 text-2xs font-semibold tabular-nums text-neutral-strong">
              {roles?.length ?? 0}
            </span>
          </div>
          <div className="lg:flex-1 lg:min-h-0">
            {isLoading ? (
              <div className="space-y-2 p-3" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="max-h-[45vh] lg:max-h-none lg:h-full" type="auto">
                <div className="divide-y divide-border">
                  {(roles ?? []).map((role) => (
                    <RoleListItem
                      key={role.id}
                      role={role}
                      isSelected={selectedRole?.id === role.id}
                      onSelect={setSelectedRole}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </Card>

        {selectedRole ? (
          <PermissionMatrix
            role={selectedRole}
            permissionGroups={permissionGroups}
            onUpdate={handleUpdateRole}
          />
        ) : (
          <EmptyState
            className="min-h-64 lg:min-h-0 lg:h-full"
            title="Select a role"
            description="Choose a role from the list to view and edit permissions"
          />
        )}
      </div>

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RoleTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogClose}
        title="Delete Role"
        description={`Are you sure you want to delete ${deleteTarget?.name ?? "this role"}? Users with this role will lose their assigned permissions.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteRole}
      />
    </PageWrapper>
  );
}


interface RoleListItemProps {
  role: Role;
  isSelected: boolean;
  onSelect: (role: Role) => void;
  onDelete: (role: Role) => void;
}

function RoleListItem({ role, isSelected, onSelect, onDelete }: RoleListItemProps) {
  const handleSelect = useCallback(() => onSelect(role), [role, onSelect]);
  const handleDelete = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(role); }, [role, onDelete]);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 pr-3 transition-colors hover:bg-accent",
        isSelected && "bg-brand-soft hover:bg-brand-soft"
      )}
    >
      {isSelected && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />}
      <button
        type="button"
        onClick={handleSelect}
        aria-current={isSelected ? "true" : undefined}
        className="min-w-0 flex-1 px-4 py-3 text-left focus-visible:focus-ring"
      >
        <p className={cn("truncate text-sm font-medium", isSelected && "text-brand-soft-foreground")}>{role.name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{role.permissions?.length ?? 0} permissions</p>
      </button>
      {role.isSystem && <StatusPill tone="neutral">System</StatusPill>}
      {!role.isSystem && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDelete}
          className="text-muted-foreground hover:bg-danger-soft hover:text-danger-strong"
          aria-label="Delete"
        >
          <Trash2 aria-hidden />
        </Button>
      )}
    </div>
  );
}
