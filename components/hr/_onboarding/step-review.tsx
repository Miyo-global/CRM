"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validations/hr";
import { formatProfessionalTax, ptAmountSchema } from "@/lib/validations/professional-tax";
import { format } from "date-fns";
import { AlertCircle, Check, Lightbulb } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EMPLOYMENT_FIELD_COPY } from "@/features/hr/employees/employment-field-copy";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface Department {
  id: number;
  name: string;
}

interface Role {
  slug: string;
  name: string;
}

interface StepReviewProps {
  form: UseFormReturn<FormValues>;
  allDepartmentOptions: (Department & { isCommon?: boolean })[];
  assignableRoles: Role[];
  managerOptions: { id: string; name: string }[];
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
}

const GENDER_LABELS: Record<NonNullable<FormValues["gender"]>, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card overflow-hidden">
      <h3 className="border-b bg-surface-sunken/60 px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <dl className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {children}
      </dl>
    </section>
  );
}

function ReviewField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  const display = value === undefined || value === null || value === "" ? "" : value;

  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-muted-foreground text-xs mb-0.5">{label}</dt>
      <dd className="font-medium break-words">{display}</dd>
    </div>
  );
}

function formatCurrency(amount: number | undefined) {
  if (amount == null || Number.isNaN(amount)) return "";
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date | undefined) {
  if (!value || Number.isNaN(value.getTime())) return "";
  return format(value, "PPP");
}

export function StepReview({
  form,
  allDepartmentOptions,
  assignableRoles,
  managerOptions,
  confirmed,
  onConfirmedChange,
}: StepReviewProps) {
  const values = form.watch();
  // Form state holds the raw text; parse it the same way the server will.
  const ptReview = ptAmountSchema.safeParse(values.professionalTax);
  const bank = values.bankDetails;

  const departmentName =
    allDepartmentOptions.find((d) => d.id === values.departmentId)?.name ?? "";
  const managerName =
    managerOptions.find((m) => m.id === values.reportingTo)?.name ?? "Not set";
  const roleName =
    assignableRoles.find((r) => r.slug === values.role)?.name ?? values.role;
  const whatsappDisplay = values.whatsappSameAsPhone
    ? `${values.phone} (same as phone)`
    : values.whatsappNumber || "";

  return (
    <div className="space-y-5 pb-2">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
          <Check className="size-6" aria-hidden="true" />
        </div>
        <h2 className="font-display text-xl font-bold">Confirm employee details</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Review every section below. Onboarding will only start after you confirm the information is correct.
        </p>
      </div>

      <ReviewSection title="Personal information">
        <ReviewField label="First name" value={values.firstName} />
        <ReviewField label="Last name" value={values.lastName} />
        <ReviewField label="Email" value={values.email} className="sm:col-span-2" />
        <ReviewField label="Phone" value={values.phone} />
        <ReviewField label="WhatsApp" value={whatsappDisplay} />
        <ReviewField label="Gender" value={values.gender ? GENDER_LABELS[values.gender] : undefined} />
        <ReviewField label="Date of birth" value={formatDate(values.dateOfBirth)} />
        <ReviewField label="Password" value="Set by the employee from the welcome email" />
      </ReviewSection>

      <ReviewSection title="Employment details">
        <ReviewField label={EMPLOYMENT_FIELD_COPY.designation.label} value={values.designation} />
        <ReviewField label={EMPLOYMENT_FIELD_COPY.department.label} value={departmentName} />
        <ReviewField label={EMPLOYMENT_FIELD_COPY.systemRole.label} value={roleName} />
        <ReviewField label="Reporting Manager" value={managerName} />
        <ReviewField
          label="Employee ID"
          value={values.employeeId?.trim() || "Auto-generated"}
        />
        <ReviewField label="Joining date" value={formatDate(values.joiningDate)} />
      </ReviewSection>

      <ReviewSection title="Skills & compensation">
        <ReviewField label="Skills" value={values.skills?.trim()} className="sm:col-span-2" />
        <ReviewField
          label="Years of experience"
          value={
            values.experienceYears != null ? String(values.experienceYears) : undefined
          }
        />
        <ReviewField label="PAN number" value={values.taxId?.trim()} />
        <ReviewField
          label="Monthly salary (CTC)"
          value={formatCurrency(values.monthlySalary)}
          className="sm:col-span-2"
        />
        <ReviewField
          label="Professional Tax"
          value={formatProfessionalTax(ptReview.success ? ptReview.data : null)}
          className="sm:col-span-2"
        />
      </ReviewSection>

      <ReviewSection title="Banking details">
        <ReviewField label="Account holder" value={bank?.accountHolder} />
        <ReviewField label="Bank name" value={bank?.bankName} />
        <ReviewField label="Branch" value={bank?.branch} />
        <ReviewField label="Account number" value={bank?.accountNumber} />
        <ReviewField label="IFSC code" value={bank?.ifsc} />
        <ReviewField label="SWIFT / BIC" value={bank?.swiftCode?.trim()} />
        <ReviewField label="IBAN" value={bank?.iban?.trim()} className="sm:col-span-2" />
        <ReviewField label="PF / UAN" value={bank?.pfUanNumber?.trim()} />
      </ReviewSection>

      <div className="flex gap-3 rounded-lg bg-warning-soft p-4 text-sm text-warning-strong">
        <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          Submitting will create the employee account and automatically add them to the onboarding workflow.
        </p>
      </div>

      <ReviewConfirm confirmed={confirmed} onConfirmedChange={onConfirmedChange} />

      {!confirmed && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          Check the confirmation box to enable Submit.
        </p>
      )}
    </div>
  );
}

function ReviewConfirm({
  confirmed,
  onConfirmedChange,
}: {
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 transition-colors",
        confirmed ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20",
      )}
    >
      <Checkbox
        id="onboard-review-confirm"
        checked={confirmed}
        onCheckedChange={(checked) => onConfirmedChange(checked === true)}
        className="mt-0.5"
      />
      <div className="space-y-1">
        <Label htmlFor="onboard-review-confirm" className="text-sm font-medium leading-snug cursor-pointer">
          I confirm that all details above are accurate
        </Label>
        <p className="text-xs text-muted-foreground">
          You must verify the preview before onboarding can be initiated.
        </p>
      </div>
    </div>
  );
}
