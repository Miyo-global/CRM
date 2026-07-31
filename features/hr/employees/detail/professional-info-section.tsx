"use client";

import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { DepartmentCombobox } from "@/components/hr/department-combobox";
import { JobRoleCombobox } from "@/components/hr/job-role-combobox";
import { Briefcase } from "lucide-react";
import { getMiyoGlobalEstablishedDate } from "@/lib/constants/company";
import { EMPLOYMENT_FIELD_COPY } from "@/features/hr/employees/employment-field-copy";
import type { EmployeeFormValues } from "@/app/(dashboard)/hr/employees/[employeeId]/edit-employee-form";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { isRoleAllowedForDepartment } from "@/lib/validations/hr";
import type { Employee } from "@/types/hr";

const NO_MANAGER = "__none__";

const FALLBACK_ROLES: Array<{ slug: string; name: string }> = [
  { slug: "ENGINEERING", name: "Engineering" },
  { slug: "HR", name: "HR" },
  { slug: "SALES", name: "Sales" },
  { slug: "CUSTOMER_SUPPORT", name: "Customer Support" },
  { slug: "DESIGN", name: "Design" },
  { slug: "VIDEO_EDITOR", name: "Video Editor" },
  { slug: "DIGITAL_MARKETING", name: "Digital Marketing" },
];

interface ProfessionalInfoSectionProps {
  assignableRoles: Array<{ slug: string; name: string }>;
  currentEmployeeId: string;
}

export function ProfessionalInfoSection({ assignableRoles, currentEmployeeId }: ProfessionalInfoSectionProps) {
  const { control, watch, setValue, getValues, clearErrors } = useFormContext<EmployeeFormValues>();
  const minJoiningDate = useMemo(() => getMiyoGlobalEstablishedDate().toISOString().split("T")[0], []);

  const { data: departments = [], isLoading: departmentsLoading } = useHrDepartments();
  const selectedDepartmentId = watch("departmentId");
  const selectedRole = watch("role");

  const selectedDepartmentName = useMemo(
    () => departments.find((d) => d.id === selectedDepartmentId)?.name,
    [departments, selectedDepartmentId],
  );

  // Keep the hidden departmentName in sync so the schema's compatibility check
  // can validate role ↔ department on submit. Skip while departments are still loading
  // so we do not briefly wipe a valid server-provided departmentName.
  useEffect(() => {
    if (selectedDepartmentId != null && departmentsLoading) return;

    const resolvedName =
      selectedDepartmentId != null
        ? (departments.find((d) => d.id === selectedDepartmentId)?.name ?? "")
        : "";

    if (getValues("departmentName") !== resolvedName) {
      setValue("departmentName", resolvedName, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }

    const role = getValues("role");
    if (role && isRoleAllowedForDepartment(role, resolvedName)) {
      clearErrors("role");
    }
  }, [
    selectedDepartmentId,
    selectedDepartmentName,
    departments,
    departmentsLoading,
    setValue,
    getValues,
    clearErrors,
  ]);

  // Only offer roles compatible with the chosen department; if the current
  // role becomes incompatible after a department change, clear it.
  const visibleRoles = useMemo(
    () => assignableRoles.filter((r) => isRoleAllowedForDepartment(r.slug, selectedDepartmentName)),
    [assignableRoles, selectedDepartmentName],
  );

  useEffect(() => {
    if (selectedDepartmentId != null && departmentsLoading) return;
    if (!selectedRole) return;

    if (!isRoleAllowedForDepartment(selectedRole, selectedDepartmentName)) {
      setValue("role", "", { shouldValidate: false, shouldDirty: true });
      return;
    }

    clearErrors("role");
  }, [
    selectedDepartmentName,
    selectedRole,
    selectedDepartmentId,
    departmentsLoading,
    setValue,
    clearErrors,
  ]);

  const { data: employeesData } = useHrEmployees();
  const managerOptions = useMemo(() => {
    const list: Employee[] = Array.isArray(employeesData)
      ? employeesData
      : (employeesData as { data?: Employee[] })?.data ?? [];
    return list
      .filter((e) => e.id !== currentEmployeeId)
      .map((e) => ({
        id: e.id,
        label: e.name?.trim() || e.email || e.id,
        sub: e.designation || e.role || "",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employeesData, currentEmployeeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Professional Information</h3>
      </div>
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">How these fields differ</p>
        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
          <li>
            <span className="font-medium text-foreground">Department</span> — organizational team (not app permissions).
          </li>
          <li>
            <span className="font-medium text-foreground">Job title</span> — official title on record.
          </li>
          <li>
            <span className="font-medium text-foreground">System role</span> — CRM access and permissions.
          </li>
        </ul>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{EMPLOYMENT_FIELD_COPY.department.label}</FormLabel>
              <FormControl>
                <DepartmentCombobox
                  value={field.value ?? null}
                  onValueChange={(val) => field.onChange(val ?? undefined)}
                  placeholder={EMPLOYMENT_FIELD_COPY.department.placeholder}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {EMPLOYMENT_FIELD_COPY.department.description}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="designation"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{EMPLOYMENT_FIELD_COPY.designation.label}</FormLabel>
              <FormControl>
                <JobRoleCombobox
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  departmentId={selectedDepartmentId ?? undefined}
                  placeholder={EMPLOYMENT_FIELD_COPY.designation.placeholder}
                  aria-invalid={fieldState.invalid}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {EMPLOYMENT_FIELD_COPY.designation.description} Pick from the catalog or type to add a new one.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{EMPLOYMENT_FIELD_COPY.systemRole.label}</FormLabel>
              <Select
                value={field.value || undefined}
                onValueChange={(value) => {
                  field.onChange(value);
                  clearErrors("role");
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={EMPLOYMENT_FIELD_COPY.systemRole.placeholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {visibleRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>{role.name}</SelectItem>
                  ))}
                  {assignableRoles.length === 0 &&
                    FALLBACK_ROLES.filter((r) =>
                      isRoleAllowedForDepartment(r.slug, selectedDepartmentName),
                    ).map((r) => (
                      <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">
                {EMPLOYMENT_FIELD_COPY.systemRole.description}
                {selectedDepartmentName ? ` Roles are filtered to fit the ${selectedDepartmentName} team.` : ""}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="reportingTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reporting Manager</FormLabel>
              <Select
                value={field.value ? field.value : NO_MANAGER}
                onValueChange={(v) => field.onChange(v === NO_MANAGER ? "" : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_MANAGER}>No manager (top level)</SelectItem>
                  {managerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                      {m.sub ? <span className="text-muted-foreground"> · {m.sub}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">
                Who this person reports to. Drives the Org Chart hierarchy.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="joiningDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Joining Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                  onChange={(v) => field.onChange(v ? new Date(v) : undefined)}
                  fromDate={new Date(minJoiningDate)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Salary (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100_000_000}
                  step={1}
                  placeholder="25000"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      field.onChange(undefined);
                      return;
                    }
                    const digitsOnly = raw.replace(/\D/g, "");
                    if (!digitsOnly) return;
                    field.onChange(Number(digitsOnly));
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="experienceYears"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience (Years)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={0}
                  max={60}
                  placeholder="e.g. 2.5"
                  value={field.value != null ? field.value : ""}
                  onKeyDown={(e) => {
                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      field.onChange(undefined);
                      return;
                    }
                    const parsed = parseFloat(v);
                    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 60) {
                      field.onChange(parsed);
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (Number.isNaN(parsed) || parsed < 0) {
                      field.onChange(undefined);
                    }
                    field.onBlur();
                  }}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="skills"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Skills</FormLabel>
              <FormControl>
                <Input
                  placeholder="React, TypeScript, Node.js"
                  maxLength={500}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
