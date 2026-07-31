"use client";

import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PersonalInfoTab } from "@/features/onboarding/personal-info-tab";
import { BankDetailsTab } from "@/features/onboarding/bank-details-tab";
import { DocumentsTab } from "@/features/onboarding/documents-tab";
import { ReviewTab } from "@/features/onboarding/review-tab";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Variants } from "framer-motion";

export const STEP_IDS = {
  PERSONAL: "personal",
  BANK: "bank",
  DOCS: "docs",
  REVIEW: "finish",
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

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

export const ONBOARDING_STEPS = [...DATA_STEPS, REVIEW_STEP];

type FormValues = Record<string, string | undefined>;

const fadeUpVariants = fadeUp as Variants;

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
    <div className="h-full flex flex-col overflow-hidden">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}: ${ONBOARDING_STEPS[currentStepIndex]?.label}`}
      </div>

      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6 lg:px-8 pt-4 pb-4 space-y-3">
        <motion.div variants={fadeUpVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Employee Onboarding</h1>
              <p className="text-sm text-muted-foreground">
                Complete your profile to get started · Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
              </p>
            </div>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">{progressPercentage}%</span>
          </div>
        </motion.div>

        <ProgressBar value={progressPercentage} ariaLabel="Onboarding progress" />

        <nav aria-label="Onboarding steps">
          <ol className="flex items-center gap-0">
            {ONBOARDING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = step.id === activeTab;
              const isPast = index < currentStepIndex;

              return (
                <li key={step.id} className="flex items-center flex-1 last:flex-initial min-w-0">
                  <button
                    type="button"
                    onClick={handleStepClick(step.id)}
                    className="flex flex-col items-center gap-1 group rounded-lg py-1 px-1.5 min-w-0"
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${step.label}${isCompleted ? " (completed)" : ""}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isCurrent
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted border-border text-muted-foreground group-hover:border-primary/50"
                    }`}>
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-[10px] font-medium text-center leading-tight hidden sm:block ${
                      isCurrent ? "text-primary" : isCompleted ? "text-emerald-600" : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 mt-[-0.75rem] hidden sm:block transition-colors ${
                        isPast || (isCompleted && index < currentStepIndex) ? "bg-emerald-500" : "bg-border"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
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
      </ScrollArea>
    </div>
  );
}
