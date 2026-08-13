"use client";

import { useEffect, useMemo } from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema, isRoleAllowedForDepartment } from "@/lib/validations/hr";
import { getCompanyEstablishedDate } from "@/lib/constants/company";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { JobRoleCombobox } from "@/components/hr/job-role-combobox";
import { EMPLOYMENT_FIELD_COPY } from "@/features/hr/employees/employment-field-copy";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

const FALLBACK_ROLES: Array<{ slug: string; name: string }> = [
  { slug: "ENGINEERING", name: "Engineering" },
  { slug: "HR", name: "HR" },
  { slug: "SALES", name: "Sales" },
  { slug: "CUSTOMER_SUPPORT", name: "Customer Support" },
  { slug: "DESIGN", name: "Design" },
  { slug: "VIDEO_EDITOR", name: "Video Editor" },
  { slug: "DIGITAL_MARKETING", name: "Digital Marketing" },
];

interface Department { id: number; name: string }
interface Role { slug: string; name: string }

interface StepEmploymentProps {
  form: UseFormReturn<FormValues>;
  departments: Department[] | undefined;
  allDepartmentOptions: (Department & { isCommon?: boolean })[];
  assignableRoles: Role[];
}

export function StepEmployment({ form, departments, allDepartmentOptions, assignableRoles }: StepEmploymentProps) {
  const companyEstablishedDate = useMemo(() => getCompanyEstablishedDate(), []);

  const selectedDepartmentId = form.watch("departmentId");
  const selectedRole = form.watch("role");

  const selectedDepartmentName = useMemo(
    () => allDepartmentOptions.find((d) => d.id === selectedDepartmentId)?.name,
    [allDepartmentOptions, selectedDepartmentId],
  );

  // Only real (persisted) departments scope the job-role catalog. The wizard
  // uses negative placeholder ids for not-yet-created "common" departments;
  // for those we fall back to org-wide roles only.
  const catalogDepartmentId = useMemo(
    () => (typeof selectedDepartmentId === "number" && selectedDepartmentId > 0 ? selectedDepartmentId : undefined),
    [selectedDepartmentId],
  );

  // Sync hidden departmentName so the schema can validate role ↔ department.
  useEffect(() => {
    if (form.getValues("departmentName") !== (selectedDepartmentName ?? "")) {
      form.setValue("departmentName", selectedDepartmentName ?? "", {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [selectedDepartmentName, form]);

  const visibleRoles = useMemo(
    () => assignableRoles.filter((r) => isRoleAllowedForDepartment(r.slug, selectedDepartmentName)),
    [assignableRoles, selectedDepartmentName],
  );

  // If the picked role no longer fits the chosen department, reset it.
  useEffect(() => {
    if (selectedRole && !isRoleAllowedForDepartment(selectedRole, selectedDepartmentName)) {
      form.setValue("role", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedDepartmentName, selectedRole, form]);

  return (
    <div className="space-y-4">
      <EmploymentFieldsIntro />
      <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {EMPLOYMENT_FIELD_COPY.department.label}{" "}
              <span className="text-destructive">*</span>
            </FormLabel>
            <Select
              value={field.value !== undefined && field.value !== null ? field.value.toString() : ""}
              onValueChange={(val) => {
                const num = parseInt(val, 10);
                field.onChange(isNaN(num) ? undefined : num);
                form.trigger("departmentId");
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={EMPLOYMENT_FIELD_COPY.department.placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                ))}
                {allDepartmentOptions.filter((d) => d.id < 0).map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              {EMPLOYMENT_FIELD_COPY.department.description}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="designation"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              {EMPLOYMENT_FIELD_COPY.designation.label}{" "}
              <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <JobRoleCombobox
                value={field.value ?? ""}
                onValueChange={field.onChange}
                departmentId={catalogDepartmentId}
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
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {EMPLOYMENT_FIELD_COPY.systemRole.label}{" "}
              <span className="text-destructive">*</span>
            </FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={EMPLOYMENT_FIELD_COPY.systemRole.placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {assignableRoles.length > 0 ? (
                  visibleRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>{role.name}</SelectItem>
                  ))
                ) : (
                  FALLBACK_ROLES.filter((r) =>
                    isRoleAllowedForDepartment(r.slug, selectedDepartmentName),
                  ).map((r) => (
                    <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>
                  ))
                )}
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
        control={form.control}
        name="joiningDate"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Joining Date <span className="text-destructive">*</span></FormLabel>
            <FormDescription className="text-xs">
              Cannot be before {format(companyEstablishedDate, "MMMM d, yyyy")} (company establishment).
            </FormDescription>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    {field.value ? format(field.value, "PPP") : "Pick a date"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => {
                    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    const min = new Date(
                      companyEstablishedDate.getFullYear(),
                      companyEstablishedDate.getMonth(),
                      companyEstablishedDate.getDate(),
                    );
                    return day < min;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="employeeId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Employee ID</FormLabel>
            <FormControl>
              <Input
                placeholder="Auto-generated if blank"
                maxLength={20}
                value={field.value ?? ""}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
                  field.onChange(next || undefined);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription className="text-xs">Leave blank to auto-generate</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      </div>
    </div>
  );
}

function EmploymentFieldsIntro() {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground mb-1">How these fields differ</p>
      <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
        <li>
          <span className="font-medium text-foreground">Department</span> — which team they sit in (org structure).
        </li>
        <li>
          <span className="font-medium text-foreground">Job title</span> — their role name on paper (e.g. Senior Engineer).
        </li>
        <li>
          <span className="font-medium text-foreground">System role</span> — what they can do in this app (permissions).
        </li>
      </ul>
    </div>
  );
}
