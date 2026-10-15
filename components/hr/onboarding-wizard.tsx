"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, type FieldPath, type DefaultValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validations/hr";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { useHrDepartments, useOnboardEmployee, useCheckEmailExists } from "@/lib/api/hooks/hr";
import { useRolesList } from "@/lib/api/hooks/roles";
import { useRouter } from "next/navigation";
import { StepPersonalInfo } from "./_onboarding/step-personal-info";
import { StepEmployment } from "./_onboarding/step-employment";
import { StepSkillsPay } from "./_onboarding/step-skills-pay";
import { StepBanking } from "./_onboarding/step-banking";
import { StepReview } from "./_onboarding/step-review";

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
  3: ["skills", "experienceYears", "taxId", "monthlySalary"],
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

const COMMON_DEPARTMENTS = ["HR", "Sales", "Customer Support", "Engineering", "Design", "Video Editing"];

const KNOWN_ACRONYMS = new Set(["CEO", "CTO", "CFO", "COO", "CMO", "CIO", "CHRO", "VP", "SVP", "EVP", "AVP", "HR", "IT", "QA", "UI", "UX"]);

function toTitleCase(str: string) {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatDesignation(str: string) {
  return str.trim().replace(/\s+/g, " ").split(" ").map((word) => {
    const upper = word.toUpperCase();
    return KNOWN_ACRONYMS.has(upper) ? upper : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const router = useRouter();
  const { data: departments } = useHrDepartments();
  const { data: orgRoles } = useRolesList();
  const onboardEmployee = useOnboardEmployee();
  const checkEmailExists = useCheckEmailExists();

  const assignableRoles = useMemo(
    () => (orgRoles ?? []).filter((r) => r.slug !== "CEO"),
    [orgRoles]
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
      whatsappSameAsPhone: true, whatsappNumber: "", gender: "MALE",
      designation: "", departmentId: undefined, departmentName: "",
      role: "ENGINEERING", employeeId: "", joiningDate: new Date(),
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
  const goToFirstError = useCallback(() => {
    const fields = Object.keys(form.formState.errors);
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

  const handleNext = useCallback(async () => {
    // Check for a known duplicate error before form.trigger() clears it
    if (currentStep === 1 && form.formState.errors.email?.message?.includes("already registered")) {
      return;
    }

    const fields = STEP_FIELDS[currentStep];
    if (fields) {
      const valid = await form.trigger(fields);
      if (!valid) {
        goToFirstError();
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
        goToFirstError();
        return;
      }
    }
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  }, [currentStep, form, checkEmailExists, goToFirstError]);

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
          phone: data.phone.trim(),
          whatsappNumber: data.whatsappSameAsPhone
            ? data.phone.trim()
            : data.whatsappNumber?.trim(),
          designation: formatDesignation(data.designation),
        } as import("@/types/hr").OnboardEmployeeInput,
        {
          onSuccess: () => {
            toast.success("Employee onboarded successfully");
            router.push("/hr/onboarding?tab=workflow");
          },
          onError: (err) => toast.error(err.message || "Failed to onboard employee"),
        }
      );
    },
    [onboardEmployee, router, currentStep]
  );

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
          onSubmit={form.handleSubmit(handleSubmit)}
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
              />
            )}
            {currentStep === 3 && <StepSkillsPay form={form} />}
            {currentStep === 4 && <StepBanking form={form} />}
            {currentStep === 5 && (
              <StepReview
                form={form}
                allDepartmentOptions={allDepartmentOptions}
                assignableRoles={assignableRoles}
                confirmed={reviewConfirmed}
                onConfirmedChange={setReviewConfirmed}
              />
            )}
          </div>

          <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-b-lg border-t bg-background/90 px-5 py-3 backdrop-blur sm:px-6">
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
                loading={checkEmailExists.isPending}
              >
                {checkEmailExists.isPending ? (
                  <>Checking...</>
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
