"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useRoles,
  useDeleteRole,
} from "@/lib/api/hooks/roles";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import {
  Plus,
  Loader2,
  Trash2,
  Shield,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <Button variant="outline" onClick={() => setTemplateOpen(true)} className="gap-2">
            <Copy className="h-4 w-4" /> Use Template
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4" /> New Role
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:h-full lg:min-h-0">
        <Card className="flex flex-col lg:min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> Roles ({roles?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 lg:flex-1 lg:min-h-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="max-h-[45vh] lg:max-h-none lg:h-full" type="auto">
                <div className="divide-y divide-border/30">
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
          </CardContent>
        </Card>

        {selectedRole ? (
          <PermissionMatrix
            role={selectedRole}
            permissionGroups={permissionGroups}
            onUpdate={handleUpdateRole}
          />
        ) : (
          <Card className="flex items-center justify-center min-h-[260px] lg:min-h-0 lg:h-full">
            <div className="text-center px-6">
              <EmptyApprovalIllustration className="mx-auto mb-3 w-40 h-40" />
              <p className="text-sm font-medium text-foreground">Select a role</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a role from the list to view and edit permissions</p>
            </div>
          </Card>
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
    <button
      onClick={handleSelect}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between",
        isSelected && "bg-muted/50 border-l-2 border-primary"
      )}
    >
      <div>
        <p className="text-sm font-medium">{role.name}</p>
        <p className="text-[11px] text-muted-foreground">{role.permissions?.length ?? 0} permissions</p>
      </div>
      <div className="flex items-center gap-2">
        {role.isSystem && <Badge variant="outline" className="text-[9px] px-1.5">System</Badge>}
        {!role.isSystem && (
          <button onClick={handleDelete} className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-500 transition-colors" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </button>
  );
}

