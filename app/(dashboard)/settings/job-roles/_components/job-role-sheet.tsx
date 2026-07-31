"use client";

import { useEffect, useState } from "react";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateJobRole, useUpdateJobRole, type JobRoleRow } from "../_lib/use-job-roles";

const ORG_WIDE = "__org_wide__";
const TITLE_MIN = 2;
const TITLE_MAX = 120;

interface JobRoleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing role when editing; undefined when creating. */
  role?: JobRoleRow | null;
  departments: Array<{ id: number; name: string }>;
}

export function JobRoleSheet({ open, onOpenChange, role, departments }: JobRoleSheetProps) {
  const isEdit = !!role;
  const [title, setTitle] = useState("");
  const [departmentValue, setDepartmentValue] = useState<string>(ORG_WIDE);
  const [isActive, setIsActive] = useState(true);

  const createRole = useCreateJobRole();
  const updateRole = useUpdateJobRole();
  const isPending = createRole.isPending || updateRole.isPending;

  useEffect(() => {
    if (open) {
      setTitle(role?.title ?? "");
      setDepartmentValue(role?.departmentId != null ? String(role.departmentId) : ORG_WIDE);
      setIsActive(role?.isActive !== false);
    }
  }, [open, role]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed.length < TITLE_MIN) {
      toast.error(`Job role must be at least ${TITLE_MIN} characters`);
      return;
    }
    if (trimmed.length > TITLE_MAX) {
      toast.error(`Job role must be at most ${TITLE_MAX} characters`);
      return;
    }
    if (!/[A-Za-z0-9]/.test(trimmed)) {
      toast.error("Job role must contain at least one letter or number");
      return;
    }
    const departmentId = departmentValue === ORG_WIDE ? null : Number(departmentValue);

    if (isEdit && role) {
      updateRole.mutate(
        { id: role.id, title: trimmed, departmentId, isActive },
        {
          onSuccess: () => {
            toast.success("Job role updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(e.message || "Failed to update job role"),
        },
      );
    } else {
      createRole.mutate(
        { title: trimmed, departmentId },
        {
          onSuccess: (res) => {
            toast.success(res.reactivated ? "Job role re-activated" : "Job role added");
            onOpenChange(false);
          },
          onError: (e) => toast.error(e.message || "Failed to add job role"),
        },
      );
    }
  };

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit job role" : "Add job role"}
      description={
        isEdit
          ? "Update the title, scope, or availability of this job role."
          : "Create a reusable job title. Scope it to a department or make it available org-wide."
      }
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Save changes" : "Add role"}
      isPending={isPending}
      submitDisabled={title.trim().length < TITLE_MIN}
    >
      <div className="space-y-2">
        <Label htmlFor="job-role-title">
          Job title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="job-role-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Senior Software Engineer"
          maxLength={TITLE_MAX}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-role-department">Department scope</Label>
        <Select value={departmentValue} onValueChange={setDepartmentValue}>
          <SelectTrigger id="job-role-department" className="w-full">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ORG_WIDE}>Org-wide (all departments)</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Org-wide roles appear for every department. Department-scoped roles only appear when that
          department is selected.
        </p>
      </div>

      {isEdit && (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div className="space-y-0.5">
            <Label className="text-sm">Active</Label>
            <p className="text-xs text-muted-foreground">
              Inactive roles are hidden from the employee forms but kept on record.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Active" />
        </div>
      )}
    </HrSheet>
  );
}
