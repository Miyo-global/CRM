"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { Briefcase, Pencil, Plus, Power, Trash2 } from "lucide-react";
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

interface RoleGroup {
  key: string;
  label: string;
  departmentId: number | null;
  roles: JobRoleRow[];
}

export default function JobRolesSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canEdit = role === "CEO" || role === "ADMIN";

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
      <PageWrapper title="Job Roles" subtitle="Manage the catalog of job titles for your organization">
        <EmptyState
          illustration={<EmptyProjectsIllustration className="h-32 w-32 opacity-95" />}
          title="Access restricted"
          description="Only Owners and Admins can manage job roles."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Job Roles"
      subtitle="Maintain reusable job titles. Scope them to a department or make them available org-wide. These power the job title picker on employee forms."
      actions={
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Job Role
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          illustration={<EmptyProjectsIllustration className="h-32 w-32 opacity-95" />}
          title="No job roles yet"
          description="Add your first job title to start building a reusable catalog for onboarding and employee records."
          action={{ label: "Add Job Role", onClick: handleAdd }}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.key} className="rounded-xl border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gold" />
                  {group.label}
                  <Badge variant="secondary" className="ml-1 font-normal">
                    {group.roles.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {group.departmentId == null
                    ? "Available across every department."
                    : `Shown when the ${group.label} department is selected.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.roles.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {r.title}
                    </span>
                    {r.isActive === false && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleActive(r)}
                        disabled={updateRole.isPending}
                        aria-label={r.isActive === false ? "Activate role" : "Deactivate role"}
                        title={r.isActive === false ? "Activate" : "Deactivate"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(r)}
                        aria-label="Edit role"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(r)}
                        disabled={deleteRole.isPending}
                        aria-label="Delete role"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
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
