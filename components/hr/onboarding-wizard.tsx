"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useForm, type FieldPath, type DefaultValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { onboardEmployeeInputSchema } from "@/lib/validations/hr";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, CircleCheck } from "lucide-react";
import { useHrDepartments, useOnboardEmployee, useCheckEmailExists, useHrEmployees, isPaginatedEmployees } from "@/lib/api/hooks/hr";
import { useRolesList } from "@/lib/api/hooks/roles";
import { StepPersonalInfo } from "./_onboarding/step-personal-info";
import { StepEmployment } from "./_onboarding/step-employment";
import { StepSkillsPay } from "./_onboarding/step-skills-pay";
import { StepBanking } from "./_onboarding/step-banking";
import { StepReview } from "./_onboarding/step-review";
import { ASSIGNABLE_ROLE_OPTIONS, filterAssignableOrgRoles } from "@/lib/rbac/roles";
import { canGrantRole } from "@/lib/auth/role-change-rules";
import { useSession } from "next-auth/react";
import { getTodayString, parseCalendarDate } from "@/lib/date-utils";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Job Details" },
  { id: 3, label: "Skills & Pay" },
  { id: 4, label: "Banking" },
  { id: 5, label: "Confirm" },
];

const STEP_FIELDS: Record<number, FieldPath<FormValues>[]> = {
  1: ["firstName", "lastName", "email", "phone", "gender", "dateOfBirth"],
  2: ["designation", "departmentId", "role", "joiningDate", "employeeId"],
  3: ["skills", "experienceYears", "taxId", "monthlySalary", "professionalTax"],
  4: [
    "bankDetails.accountNumber",
    "bankDetails.bankName",
    "bankDetails.branch",
    "bankDetails.ifsc",
    "bankDetails.accountHolder",
    "bankDetails.swiftCode",
    "bankDetails.iban",
    "bankDetails.pfUanNumber",
  ],
};

// QA-SALES-01: no Sales department is suggested; there is no sales function.
const COMMON_DEPARTMENTS = ["HR", "Customer Support", "Engineering", "Design", "Video Editing"];

/**
 * MIYO-0663: a hire that came through the ATS arrives with the candidate's
 * details already filled in, and the application is closed once the
 * employee exists.
 */
export interface OnboardingPrefill {
  applicationId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  designation?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  joiningDate?: string | null;
  monthlySalary?: string | null;
}

export function OnboardingWizard({ prefill }: { prefill?: OnboardingPrefill } = {}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  // One click advances: the button stays busy for the whole validate + email
  // check, and a second click meanwhile is ignored (R3-INV-05).
  const [advancing, setAdvancing] = useState(false);
  const advancingRef = useRef(false);
  const [onboarded, setOnboarded] = useState<{
    userId?: string;
    employeeId?: string;
    name: string;
    email: string;
    welcomeEmailSent?: boolean;
  } | null>(null);
  const { data: departments } = useHrDepartments();
  const { data: orgRoles } = useRolesList();
  const onboardEmployee = useOnboardEmployee();
  const checkEmailExists = useCheckEmailExists();

  // Candidate managers for the Reporting Manager field (QA-0021).
  const { data: employeesData } = useHrEmployees();
  const managerOptions = useMemo(() => {
    const list = isPaginatedEmployees(employeesData) ? employeesData.data : employeesData ?? [];
    return list.map((e) => ({
      id: e.id,
      name: e.name ?? ([e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || "Employee"),
      subtitle: e.designation ?? undefined,
    }));
  }, [employeesData]);

  // R3-HR-02: offer only what the actor may grant; the onboard API enforces
  // the same rule.
  const actorRole = useSession().data?.user?.role;
  const assignableRoles = useMemo(
    () => {
      const fromOrg: Array<{ slug: string; name: string }> = filterAssignableOrgRoles(orgRoles ?? []);
      const list = fromOrg.length > 0
        ? fromOrg
        : ASSIGNABLE_ROLE_OPTIONS.map((r) => ({ slug: r.value, name: r.label }));
      return list.filter((r) => canGrantRole(actorRole, r.slug));
    },
    [orgRoles, actorRole]
  );

  const allDepartmentOptions = useMemo(() => {
    const dbNames = new Set(departments?.map((d) => d.name.toLowerCase()) ?? []);
    const extras = COMMON_DEPARTMENTS
      .filter((name) => !dbNames.has(name.toLowerCase()))
      .map((name, i) => ({ id: -(i + 1), name, isCommon: true }));
    return [...(departments ?? []), ...extras];
  }, [departments]);

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      whatsappSameAsPhone: true, whatsappNumber: "", gender: undefined,
      designation: "", departmentId: undefined, departmentName: "", reportingTo: "",
      role: "EMPLOYEE", employeeId: "", joiningDate: parseCalendarDate(getTodayString()),
      dateOfBirth: undefined, skills: "", experienceYears: undefined,
      taxId: "", monthlySalary: undefined,
      bankDetails: {
        accountNumber: "",
        bankName: "",
        branch: "",
        ifsc: "",
        accountHolder: "",
        pfUanNumber: "",
        swiftCode: "",
        iban: "",
      },
    } as DefaultValues<FormValues>,
    mode: "onChange",
  });

  // The prefill arrives after the first render, so the form is reset once
  // it lands rather than being built around it.
  useEffect(() => {
    if (!prefill) return;
    form.reset({
      ...form.getValues(),
      firstName: prefill.firstName ?? "",
      lastName: prefill.lastName ?? "",
      email: prefill.email ?? "",
      phone: prefill.phone ?? "",
      designation: prefill.designation ?? "",
      departmentId: prefill.departmentId ?? undefined,
      departmentName: prefill.departmentName ?? "",
      joiningDate: parseCalendarDate(prefill.joiningDate || getTodayString()),
      monthlySalary: prefill.monthlySalary ? Number(prefill.monthlySalary) : undefined,
    } as DefaultValues<FormValues> as FormValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.applicationId]);

  useEffect(() => {
    if (currentStep !== STEPS.length) {
      setReviewConfirmed(false);
    }
  }, [currentStep]);

  /** The wizard step a field belongs to, or null when it is not on a step. */
  const stepOfField = useCallback((field: string): number | null => {
    for (const [step, fields] of Object.entries(STEP_FIELDS)) {
      if (fields.some((f) => f === field || field.startsWith(`${f}.`))) return Number(step);
    }
    return null;
  }, []);

  /**
   * Show the first error instead of failing silently: go to its step, focus the
   * field and let the message render (A16).
   */
  const goToFirstError = useCallback((errors: object = form.formState.errors) => {
    const fields = Object.keys(errors);
    if (fields.length === 0) return false;
    const steps = fields
      .map((f) => stepOfField(f))
      .filter((s): s is number => s != null)
      .sort((a, b) => a - b);
    const target = steps[0] ?? currentStep;
    const field = fields.find((f) => stepOfField(f) === target) ?? fields[0];
    setCurrentStep(target);
    requestAnimationFrame(() => {
      form.setFocus(field as FieldPath<FormValues>, { shouldSelect: true });
    });
    toast.error("Fix the highlighted field to continue");
    return true;
  }, [form, stepOfField, currentStep]);

  const advance = useCallback(async () => {
    // Check for a known duplicate error before form.trigger() clears it
    if (currentStep === 1 && form.formState.errors.email?.message?.includes("already registered")) {
      toast.error("This email is already registered. Use a different address.");
      return;
    }

    const fields = STEP_FIELDS[currentStep];
    if (fields) {
      const valid = await form.trigger(fields);
      if (!valid) {
        goToFirstError(form.formState.errors);
        return;
      }
    }
    if (currentStep === 1) {
      const email = form.getValues("email");
      try {
        const { exists } = await checkEmailExists.mutateAsync(email);
        if (exists) {
          form.setError("email", { message: "This email is already registered" });
          return;
        }
      } catch {
        form.setError("email", { message: "Could not verify email availability. Please try again." });
        return;
      }
    }
    if (currentStep === 4) {
      const fullValid = await form.trigger();
      if (!fullValid) {
        goToFirstError(form.formState.errors);
        return;
      }
    }
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  }, [currentStep, form, checkEmailExists, goToFirstError]);

  const handleNext = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setAdvancing(true);
    try {
      await advance();
    } finally {
      advancingRef.current = false;
      setAdvancing(false);
    }
  }, [advance]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleSubmit = useCallback(
    (data: FormValues) => {
      if (currentStep !== STEPS.length) return;
      onboardEmployee.mutate(
        {
          ...data,
          // Names are stored exactly as typed, trimmed (A18).
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim(),
          whatsappNumber: data.whatsappSameAsPhone
            ? data.phone?.trim()
            : data.whatsappNumber?.trim(),
          // Stored as typed (R3-ONB-03): "QA-TEST Engineer" must not become "Qa-test Engineer".
          designation: data.designation.trim().replace(/\s+/g, " "),
          // Send the calendar days as picked, not a UTC instant (R2-LC-02).
          joiningDate: format(data.joiningDate, "yyyy-MM-dd"),
          dateOfBirth: data.dateOfBirth ? format(data.dateOfBirth, "yyyy-MM-dd") : undefined,
        } as import("@/types/hr").OnboardEmployeeInput,
        {
          onSuccess: async (result) => {
            toast.success("Employee onboarded successfully");
            setOnboarded({
              userId: result?.userId,
              employeeId: result?.employeeId,
              name: `${data.firstName.trim()} ${data.lastName.trim()}`,
              email: data.email.trim(),
              welcomeEmailSent: result?.welcomeEmailSent,
            });
            // Close the application this hire came from. A failure here
            // leaves the employee in place; the recruiter can mark it later.
            if (prefill?.applicationId && result?.userId) {
              try {
                await fetch(`/api/ats/applications/${prefill.applicationId}/hire`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: result.userId }),
                });
              } catch {
                toast.error("Employee created, but the application stayed open.");
              }
            }
          },
          onError: (err) => toast.error(err.message || "Failed to onboard employee"),
        }
      );
    },
    [onboardEmployee, currentStep, prefill?.applicationId]
  );

  const startAnother = useCallback(() => {
    form.reset();
    setOnboarded(null);
    setCurrentStep(1);
  }, [form]);

  // Success step (R3-ONB-09): ID, welcome-email status and a link to the profile
  // instead of a toast and a redirect.
  if (onboarded) {
    return (
      <div role="status" className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-xs">
        <CircleCheck className="size-10 text-success-strong" aria-hidden="true" />
        <h2 className="text-lg font-semibold">{onboarded.name} has been onboarded</h2>
        <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left text-sm">
          <dt className="text-muted-foreground">Employee ID</dt>
          <dd className="font-medium tabular-nums">{onboarded.employeeId ?? "Not assigned"}</dd>
          <dt className="text-muted-foreground">Welcome email</dt>
          <dd className="font-medium">
            {onboarded.welcomeEmailSent
              ? `Sent to ${onboarded.email}`
              : "Not sent. Resend the set-up link from the employee's profile."}
          </dd>
        </dl>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {onboarded.userId && (
            <Button asChild>
              <Link href={`/hr/employees/${onboarded.userId}`}>View profile</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/hr/onboarding?tab=workflow">Onboarding progress</Link>
          </Button>
          <Button variant="ghost" onClick={startAnother}>Onboard another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[200px_1fr]">
      <nav aria-label="Onboarding steps" className="lg:sticky lg:top-20 lg:self-start">
        <ol className="flex items-center gap-1 overflow-x-auto lg:flex-col lg:items-stretch lg:gap-0">
          {STEPS.map((step, i) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            return (
              <li key={step.id} className="flex flex-1 items-center gap-1 lg:flex-col lg:items-stretch lg:gap-0">
                <button
                  type="button"
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:focus-ring",
                    isCompleted && "cursor-pointer text-foreground hover:bg-accent",
                    isActive && "font-semibold text-foreground",
                    !isCompleted && !isActive && "cursor-not-allowed text-muted-foreground"
                  )}
                >
                  <span className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums",
                    isCompleted && "border-gold-400 bg-gold-400 text-ink-950",
                    isActive && "border-gold-400 bg-background text-foreground",
                    !isCompleted && !isActive && "border-ink-200 bg-background text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="size-4" aria-hidden="true" /> : step.id}
                  </span>
                  <span className={cn("truncate", !isActive && "hidden sm:inline")}>{step.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "h-px w-3 shrink-0 lg:ml-5.5 lg:h-4 lg:w-px",
                      isCompleted ? "bg-gold-400" : "bg-border"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <Form {...form}>
        <form
          // A failed final submit jumps to the first broken step too (MIYO-0094).
          onSubmit={form.handleSubmit(handleSubmit, (errors) => goToFirstError(errors))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && currentStep < STEPS.length) {
              e.preventDefault();
            }
          }}
          className="flex w-full min-w-0 max-w-2xl flex-col rounded-lg border bg-card shadow-xs"
        >
          <div className="p-5 sm:p-6">
            {currentStep === 1 && <StepPersonalInfo form={form} />}
            {currentStep === 2 && (
              <StepEmployment
                form={form}
                departments={departments}
                allDepartmentOptions={allDepartmentOptions}
                assignableRoles={assignableRoles}
                managerOptions={managerOptions}
              />
            )}
            {currentStep === 3 && <StepSkillsPay form={form} />}
            {currentStep === 4 && <StepBanking form={form} />}
            {currentStep === 5 && (
              <StepReview
                form={form}
                allDepartmentOptions={allDepartmentOptions}
                assignableRoles={assignableRoles}
                managerOptions={managerOptions}
                confirmed={reviewConfirmed}
                onConfirmedChange={setReviewConfirmed}
              />
            )}
          </div>

          <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-b-lg border-t bg-background px-5 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 1 || onboardEmployee.isPending}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                loading={advancing}
                aria-busy={advancing}
              >
                {advancing ? (
                  <>{currentStep === 1 ? "Checking..." : "Validating..."}</>
                ) : (
                  <>Next<ChevronRight className="size-4" aria-hidden="true" /></>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!reviewConfirmed}
                loading={onboardEmployee.isPending}
              >
                {onboardEmployee.isPending ? (
                  <>Onboarding...</>
                ) : (
                  <><Check className="size-4" aria-hidden="true" />Confirm & onboard</>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
