"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building, Pencil, Plus, Trash2 } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmployeeAssignCombobox } from "@/components/hr/employee-assign-combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  useHrDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useHrEmployees,
} from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Department } from "@/types/hr";

const NAME_MAX = 100;

export default function DepartmentsSettingsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "ADMIN"]}>
      <DepartmentsContent />
    </DashboardGate>
  );
}

function DepartmentsContent() {
  const { data: departments, isLoading } = useHrDepartments();
  const { data: employeesData } = useHrEmployees({ fields: "picker" });
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");

  const employees = useMemo(() => {
    const list = Array.isArray(employeesData) ? employeesData : employeesData?.data ?? [];
    return list.map((e) => ({ id: e.id, name: e.name ?? e.email ?? e.id }));
  }, [employeesData]);
  const nameById = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);

  const sorted = useMemo(
    () => [...(departments ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [departments],
  );

  const openSheet = useCallback((dept: Department | null) => {
    setEditing(dept);
    setName(dept?.name ?? "");
    setManagerId(dept?.managerId ?? "");
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Department name is required");
      return;
    }
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Department updated" : "Department added");
        setSheetOpen(false);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    };
    if (editing) {
      updateDept.mutate(
        {
          id: editing.id,
          name: trimmed === editing.name ? undefined : trimmed,
          managerId: managerId || null,
        },
        opts,
      );
    } else {
      createDept.mutate({ name: trimmed, managerId: managerId || null }, opts);
    }
  }, [name, managerId, editing, createDept, updateDept]);

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    deleteDept.mutate(deleting.id, {
      onSuccess: () => toast.success("Department deleted"),
      // A department with employees comes back 409 with the count.
      onError: (e) => toast.error(getErrorMessage(e)),
    });
    setDeleting(null);
  }, [deleting, deleteDept]);

  return (
    <PageWrapper
      title="Departments"
      actions={
        <Button size="sm" onClick={() => openSheet(null)}>
          <Plus aria-hidden />
          Add department
        </Button>
      }
    >
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-5">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              icon={Building}
              title="No departments yet. Add one above."
              action={{ label: "Add department", onClick: () => openSheet(null) }}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((dept) => {
                const members = dept.memberCount ?? 0;
                return (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dept.managerId ? nameById.get(dept.managerId) ?? "—" : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{members}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => openSheet(dept)}
                          aria-label={`Edit ${dept.name}`}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleting(dept)}
                          disabled={deleteDept.isPending || members > 0}
                          title={members > 0 ? "Reassign its employees before deleting" : undefined}
                          aria-label={`Delete ${dept.name}`}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete department?"
        description={`"${deleting?.name ?? ""}" will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Edit department" : "Add department"}
        description={editing ? "Rename the department or change its head." : "Create a department for your organization."}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save changes" : "Add department"}
        isPending={createDept.isPending || updateDept.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="dept-name" className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dept-name"
            value={name}
            maxLength={NAME_MAX}
            placeholder="e.g. Engineering"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Head <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <EmployeeAssignCombobox
            employees={employees}
            value={managerId}
            onValueChange={setManagerId}
            placeholder="No head"
            ariaLabel="Department head"
          />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
