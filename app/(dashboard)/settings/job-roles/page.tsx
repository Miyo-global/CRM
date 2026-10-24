"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHrDepartments } from "@/lib/api/hooks/hr";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useJobRolesAdmin,
  useUpdateJobRole,
  useDeleteJobRole,
  type JobRoleRow,
} from "./_lib/use-job-roles";
import { JobRoleSheet } from "./_components/job-role-sheet";
import { canManageJobRoles } from "@/lib/constants/roles";

interface RoleGroup {
  key: string;
  label: string;
  departmentId: number | null;
  roles: JobRoleRow[];
}

export default function JobRolesSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canEdit = canManageJobRoles(role);

  const { data: roles = [], isLoading } = useJobRolesAdmin();
  const { data: departments = [] } = useHrDepartments();

  const updateRole = useUpdateJobRole();
  const deleteRole = useDeleteJobRole();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<JobRoleRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JobRoleRow | null>(null);

  const groups = useMemo<RoleGroup[]>(() => {
    const orgWide = roles.filter((r) => r.departmentId == null);
    const byDept = new Map<number, JobRoleRow[]>();
    for (const r of roles) {
      if (r.departmentId == null) continue;
      const list = byDept.get(r.departmentId) ?? [];
      list.push(r);
      byDept.set(r.departmentId, list);
    }
    const deptGroups: RoleGroup[] = [...byDept.entries()]
      .map(([deptId, list]) => ({
        key: `dept-${deptId}`,
        label: list[0]?.departmentName ?? `Department #${deptId}`,
        departmentId: deptId,
        roles: list.slice().sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const result: RoleGroup[] = [];
    if (orgWide.length > 0) {
      result.push({
        key: "org-wide",
        label: "Org-wide",
        departmentId: null,
        roles: orgWide.slice().sort((a, b) => a.title.localeCompare(b.title)),
      });
    }
    return [...result, ...deptGroups];
  }, [roles]);

  const handleAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const handleEdit = (r: JobRoleRow) => {
    setEditing(r);
    setSheetOpen(true);
  };

  const handleToggleActive = (r: JobRoleRow) => {
    updateRole.mutate(
      { id: r.id, isActive: r.isActive === false },
      {
        onSuccess: () =>
          toast.success(r.isActive === false ? "Job role activated" : "Job role deactivated"),
        onError: (e) => toast.error(e.message || "Failed to update job role"),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteRole.mutate(target.id, {
      onSuccess: () => {
        toast.success("Job role deleted");
        setPendingDelete(null);
      },
      onError: (e) => {
        toast.error(e.message || "Failed to delete job role");
        setPendingDelete(null);
      },
    });
  };

  if (!canEdit) {
    return (
      <PageWrapper title="Job roles">
        <EmptyState
          title="Access restricted"
          description="Only Admins and the Super Admin can manage job roles."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Job roles"
      actions={
        <Button size="sm" onClick={handleAdd}>
          <Plus aria-hidden />
          Add Job Role
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          title="No job roles yet"
          description="Add your first job title to start building a reusable catalog for onboarding and employee records."
          action={{ label: "Add Job Role", onClick: handleAdd }}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.key} className="overflow-hidden">
              <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    {group.label}
                    <span className="inline-flex h-5 items-center rounded-full bg-neutral-soft px-2 text-2xs font-semibold tabular-nums text-neutral-strong">
                      {group.roles.length}
                    </span>
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.departmentId == null
                      ? "Available across every department."
                      : `Shown when the ${group.label} department is selected.`}
                  </p>
                </div>
              </div>
              <Table>
                <TableBody>
                  {group.roles.map((r) => (
                    <TableRow key={r.id} className="group">
                      <TableCell className="w-full max-w-0 truncate font-medium" title={r.title}>
                        {r.title}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={r.isActive === false ? "neutral" : "success"} dot>
                          {r.isActive === false ? "Inactive" : "Active"}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleToggleActive(r)}
                            disabled={updateRole.isPending}
                            aria-label={r.isActive === false ? "Activate role" : "Deactivate role"}
                            title={r.isActive === false ? "Activate" : "Deactivate"}
                          >
                            <Power aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEdit(r)}
                            aria-label="Edit role"
                            title="Edit"
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                            onClick={() => setPendingDelete(r)}
                            disabled={deleteRole.isPending}
                            aria-label="Delete role"
                            title="Delete"
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      <JobRoleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        role={editing}
        departments={departments}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete job role?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from the catalog. Employees already assigned this title keep it on their record.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
