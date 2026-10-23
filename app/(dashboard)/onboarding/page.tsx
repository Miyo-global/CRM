"use client";

import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PersonalInfoTab } from "@/features/onboarding/personal-info-tab";
import { BankDetailsTab } from "@/features/onboarding/bank-details-tab";
import { DocumentsTab } from "@/features/onboarding/documents-tab";
import { ReviewTab } from "@/features/onboarding/review-tab";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";

const STEP_IDS = {
  PERSONAL: "personal",
  BANK: "bank",
  DOCS: "docs",
  REVIEW: "finish",
} as const;

type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

const VALID_STEP_IDS: ReadonlySet<string> = new Set(Object.values(STEP_IDS));

function isStepId(value: string): value is StepId {
  return VALID_STEP_IDS.has(value);
}

const NEXT_STEP: Partial<Record<StepId, StepId>> = {
  [STEP_IDS.PERSONAL]: STEP_IDS.BANK,
  [STEP_IDS.BANK]: STEP_IDS.DOCS,
  [STEP_IDS.DOCS]: STEP_IDS.REVIEW,
};

const DATA_STEPS = [
  { id: STEP_IDS.PERSONAL, label: "Personal Info", icon: User },
  { id: STEP_IDS.BANK, label: "Bank Details", icon: Landmark },
  { id: STEP_IDS.DOCS, label: "Documents", icon: FileText },
] as const;

const REVIEW_STEP = { id: STEP_IDS.REVIEW, label: "Review & Sign", icon: ClipboardCheck } as const;

const ONBOARDING_STEPS = [...DATA_STEPS, REVIEW_STEP];

type FormValues = Record<string, string | undefined>;


export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState<StepId>(STEP_IDS.PERSONAL);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [savedFormData, setSavedFormData] = useState<Record<string, FormValues>>({});

  const currentStepIndex = Math.max(0, ONBOARDING_STEPS.findIndex((s) => s.id === activeTab));
  const progressPercentage = useMemo(
    () => DATA_STEPS.length > 0
      ? Math.round((completedSteps.size / DATA_STEPS.length) * 100)
      : 0,
    [completedSteps.size],
  );

  const completeHandlers = useMemo(() => {
    const makeHandler = (stepId: StepId) => (values?: FormValues) => {
      if (values) {
        setSavedFormData((prev) => ({ ...prev, [stepId]: values }));
      }
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(stepId);
        return next;
      });
      const next = NEXT_STEP[stepId];
      if (next) setActiveTab(next);
    };
    return {
      [STEP_IDS.PERSONAL]: makeHandler(STEP_IDS.PERSONAL),
      [STEP_IDS.BANK]: makeHandler(STEP_IDS.BANK),
      [STEP_IDS.DOCS]: makeHandler(STEP_IDS.DOCS),
    } as const;
  }, []);

  const goToHandlers = useMemo(() => ({
    [STEP_IDS.PERSONAL]: () => setActiveTab(STEP_IDS.PERSONAL),
    [STEP_IDS.BANK]: () => setActiveTab(STEP_IDS.BANK),
    [STEP_IDS.DOCS]: () => setActiveTab(STEP_IDS.DOCS),
  }), []);

  const handleTabChange = useCallback((v: string) => {
    if (isStepId(v)) setActiveTab(v);
  }, []);

  const handleStepClick = useCallback((stepId: StepId) => () => {
    setActiveTab(stepId);
  }, []);

  return (
    <PageWrapper
      title="Employee onboarding"
      subtitle={
        <span className="tabular-nums">
          Complete your profile to get started · Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
        </span>
      }
      actions={
        <div className="w-56 tabular-nums">
          <ProgressBar value={progressPercentage} ariaLabel="Onboarding progress" />
        </div>
      }
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}: ${ONBOARDING_STEPS[currentStepIndex]?.label}`}
      </div>

      <div
        className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[220px_1fr]"
      >
        <nav aria-label="Onboarding steps" className="lg:sticky lg:top-6 lg:self-start">
          <ol className="flex items-start gap-1 overflow-x-auto lg:flex-col lg:gap-0">
            {ONBOARDING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = step.id === activeTab;
              const isLast = index === ONBOARDING_STEPS.length - 1;

              return (
                <li key={step.id} className="relative flex-1 lg:flex-initial">
                  <button
                    type="button"
                    onClick={handleStepClick(step.id)}
                    className={cn(
                      "flex w-full min-w-0 flex-col items-center gap-1.5 rounded-md p-2 text-center outline-none transition-colors hover:bg-accent focus-visible:focus-ring lg:flex-row lg:gap-3 lg:text-left",
                      isCurrent && "lg:bg-accent"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${step.label}${isCompleted ? " (completed)" : ""}`}
                  >
                    <span
                      className={cn(
                        "relative z-base flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-brand-soft text-brand-soft-foreground ring-2 ring-gold-400"
                          : "border border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="size-4" aria-hidden="true" /> : <StepIcon className="size-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="hidden text-2xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
                        Step {index + 1}
                      </span>
                      <span
                        className={cn(
                          "hidden text-xs font-medium leading-tight sm:block lg:text-sm",
                          isCurrent ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </span>
                  </button>
                  {!isLast && (
                    <span
                      className={cn(
                        "absolute top-10 left-6 hidden h-5 w-px -translate-x-1/2 lg:block",
                        isCompleted ? "bg-gold-400" : "bg-border"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <Card className="w-full max-w-2xl">
          <CardContent className="pt-1">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsContent value={STEP_IDS.PERSONAL}>
                <PersonalInfoTab
                  onComplete={completeHandlers[STEP_IDS.PERSONAL]}
                  defaultValues={savedFormData[STEP_IDS.PERSONAL]}
                />
              </TabsContent>
              <TabsContent value={STEP_IDS.BANK}>
                <BankDetailsTab
                  onComplete={completeHandlers[STEP_IDS.BANK]}
                  onBack={goToHandlers[STEP_IDS.PERSONAL]}
                  defaultValues={savedFormData[STEP_IDS.BANK]}
                />
              </TabsContent>
              <TabsContent value={STEP_IDS.DOCS}>
                <DocumentsTab
                  onComplete={completeHandlers[STEP_IDS.DOCS]}
                  onBack={goToHandlers[STEP_IDS.BANK]}
                  savedUploads={savedFormData[STEP_IDS.DOCS]}
                />
              </TabsContent>
              <TabsContent value={STEP_IDS.REVIEW}>
                <ReviewTab
                  completedSteps={completedSteps}
                  steps={ONBOARDING_STEPS}
                  reviewStepId={STEP_IDS.REVIEW}
                  onBack={goToHandlers[STEP_IDS.DOCS]}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
