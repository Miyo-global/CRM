"use client";

import { useCallback, useMemo } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  editEmployeeFormSchema,
  type EditEmployeeFormValues,
} from "@/lib/validations/hr";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { useUpdateProfile } from "@/lib/api/hooks/hr";
import { Loader2 } from "lucide-react";
import { useRolesList } from "@/lib/api/hooks/roles";
import { PersonalInfoSection } from "@/features/hr/employees/detail/personal-info-section";
import { ProfessionalInfoSection } from "@/features/hr/employees/detail/professional-info-section";
import { BankDetailsSection } from "@/features/hr/employees/detail/bank-details-section";
import { ActiveStatusSection } from "@/features/hr/employees/detail/active-status-section";
import { PortalAccessSection } from "@/features/hr/employees/portal-access-section";

export type EmployeeFormValues = EditEmployeeFormValues;

export interface EmployeeData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
  designation: string | null;
  departmentId: number | null;
  departmentName?: string | null;
  department?: { id: number; name: string } | null;
  reportingTo: string | null;
  phone: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  joiningDate: string | Date | null;
  experienceYears: string | number | null;
  skills: string[] | string | null;
  taxId: string | null;
  monthlySalary: string | number | null;
  isActive?: boolean | null;
  hasDashboardAccess?: boolean | null;
  bankDetails: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
    swiftCode?: string;
    iban?: string;
  } | null;
  [key: string]: unknown;
}

interface EditEmployeeFormProps {
  employee: EmployeeData;
}

export function EditEmployeeForm({ employee }: EditEmployeeFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const canManageActiveStatus =
    isAdminOrOwner(session?.user?.role) && session?.user?.id !== employee.id;
  const canManagePortalAccess =
    (session?.user?.role === "CEO" || session?.user?.role === "HR") &&
    session?.user?.id !== employee.id;
  const updateProfileMutation = useUpdateProfile();
  const { data: orgRoles } = useRolesList();
  const assignableRoles = useMemo(
    () => (orgRoles || []).filter((r) => r.slug !== "CEO"),
    [orgRoles],
  );

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(editEmployeeFormSchema) as unknown as Resolver<EmployeeFormValues>,
    defaultValues: {
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      role: (employee.role || "ENGINEERING").trim().toUpperCase(),
      designation: employee.designation || "",
      departmentId: employee.departmentId || undefined,
      departmentName:
        employee.department?.name ||
        (typeof employee.departmentName === "string" ? employee.departmentName : "") ||
        "",
      reportingTo: employee.reportingTo || "",
      phone: employee.phone || "",
      gender: employee.gender || "MALE",
      joiningDate: employee.joiningDate ? new Date(employee.joiningDate) : undefined,
      experienceYears:
        employee.experienceYears != null && employee.experienceYears !== ""
          ? Number(employee.experienceYears)
          : undefined,
      skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : (employee.skills || ""),
      taxId: employee.taxId || "",
      monthlySalary: employee.monthlySalary ? Number(employee.monthlySalary) : undefined,
      bankAccount: employee.bankDetails?.accountNumber || "",
      bankName: employee.bankDetails?.bankName || "",
      branch: employee.bankDetails?.branch || "",
      ifsc: employee.bankDetails?.ifsc || "",
      accountHolder: employee.bankDetails?.accountHolder || "",
      swiftCode: employee.bankDetails?.swiftCode || "",
      iban: employee.bankDetails?.iban || "",
    },
    mode: "onTouched",
  });

  const onSubmit = useCallback(
    async (values: EmployeeFormValues) => {
      const skillsArray = values.skills
        ? values.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      toast.promise(
        updateProfileMutation.mutateAsync({
          userId: employee.id,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          role: values.role,
          designation: values.designation.trim(),
          departmentId: values.departmentId,
          reportingTo: values.reportingTo ? values.reportingTo : null,
          phone: values.phone?.trim() || undefined,
          gender: values.gender,
          joiningDate: values.joiningDate?.toISOString().slice(0, 10),
          experienceYears: values.experienceYears,
          skills: skillsArray,
          taxId: values.taxId?.trim().toUpperCase() || undefined,
          monthlySalary: values.monthlySalary,
          bankDetails: values.bankAccount?.trim()
            ? {
                accountNumber: values.bankAccount.trim(),
                bankName: values.bankName?.trim() || "",
                branch: values.branch?.trim() || "",
                ifsc: values.ifsc?.trim().toUpperCase() || "",
                accountHolder: values.accountHolder?.trim() || "",
                swiftCode: values.swiftCode?.trim().toUpperCase() || undefined,
                iban: values.iban?.trim().toUpperCase() || undefined,
              }
            : undefined,
        }),
        {
          loading: "Updating employee...",
          success: () => {
            router.push(`/hr/employees/${employee.id}`);
            router.refresh();
            return "Employee updated successfully!";
          },
          error: (err) =>
            err instanceof Error ? err.message : "Failed to update employee",
        },
      );
    },
    [employee.id, router, updateProfileMutation],
  );

  const onInvalid = useCallback(() => {
    toast.error("Please fix the highlighted fields before saving.");
  }, []);

  const handleCancel = useCallback(() => router.back(), [router]);

  return (
    <div className="space-y-4">
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="rounded-lg border bg-card"
          noValidate
        >
          <div className="p-4">
            <PersonalInfoSection />
          </div>
          <Separator />
          <div className="p-4">
            <ProfessionalInfoSection assignableRoles={assignableRoles} currentEmployeeId={employee.id} />
          </div>
          <Separator />
          <div className="p-4 pb-20">
            <BankDetailsSection />
          </div>
          <div className="sticky bottom-0 flex justify-between gap-2 px-4 py-3 bg-card border-t z-10">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleCancel}
              disabled={updateProfileMutation.isPending}
            >
              Back
            </Button>
            <Button size="sm" type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </FormProvider>

      {canManagePortalAccess && (
        <div className="rounded-lg border bg-card p-4">
          <PortalAccessSection
            employeeId={employee.id}
            employeeName={`${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || employee.email}
            employeeRole={(employee.role || "EMPLOYEE").trim().toUpperCase()}
            initialHasAccess={employee.hasDashboardAccess !== false}
            currentUserId={session?.user?.id}
          />
        </div>
      )}

      {canManageActiveStatus && (
        <div className="rounded-lg border bg-card p-4">
          <ActiveStatusSection
            employeeId={employee.id}
            employeeName={`${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || employee.email}
            initialIsActive={employee.isActive !== false}
          />
        </div>
      )}
    </div>
  );
}
