"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, ArrowRight, Check, Send, Shield, type LucideIcon } from "lucide-react";
import { submitOnboarding } from "@/server/actions/onboarding-actions";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  ADMIN: "Admin",
  HR: "Human Resources",
  ENGINEERING: "Engineering",
  SALES: "Sales",
  DIGITAL_MARKETING: "Digital Marketing",
  CUSTOMER_SUPPORT: "Customer Support",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
};

interface Step {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface ReviewTabProps {
  completedSteps: Set<string>;
  steps: Step[];
  reviewStepId: string;
  onBack: () => void;
}

export function ReviewTab({ completedSteps, steps, reviewStepId, onBack }: ReviewTabProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const userRole = session?.user?.role;
  const roleLabel = userRole ? ROLE_LABELS[userRole] || userRole : "Pending assignment";
  const dataSteps = steps.filter((s) => s.id !== reviewStepId);
  const allDataStepsComplete = dataSteps.every((s) => completedSteps.has(s.id));

  const handleGoToDashboard = useCallback(() => router.push("/dashboard"), [router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await submitOnboarding();
      if (res.success) {
        toast.success("Onboarding submitted successfully!");
        setIsSubmitted(true);
      } else {
        toast.error(res.error || "Failed to submit onboarding");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-0 bg-transparent py-6 text-center shadow-none">
        <CardContent className="flex flex-col items-center space-y-4">
          <div
            className="flex flex-col items-center space-y-4"
          >
            <div className="bg-success-soft p-4 rounded-full">
              <CheckCircle className="size-12 text-success-strong" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl font-bold">You&apos;re All Set!</h2>
            <p className="text-muted-foreground max-w-md">
              Your onboarding information has been submitted. The HR team will verify your documents and approve your profile soon.
            </p>

            <div className="w-full max-w-sm space-y-2 pt-4">
              {dataSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 p-3 rounded-lg text-left bg-success-soft"
                >
                  <Check className="h-5 w-5 text-success-strong shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium text-success-strong">
                    {step.label}
                  </span>
                  <span className="ml-auto text-xs text-success-strong">
                    Completed
                  </span>
                </div>
              ))}

              <div className="flex items-center gap-3 p-3 rounded-lg text-left bg-brand-soft">
                <Shield className="h-5 w-5 text-brand-text shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-brand-text">
                  Role: {roleLabel}
                </span>
                <span className="ml-auto text-xs text-brand-text">
                  Assigned
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={handleGoToDashboard}>
                Go to Dashboard
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-transparent py-6 text-center shadow-none">
      <CardContent className="flex flex-col items-center space-y-4">
        <div
          className="flex flex-col items-center space-y-4"
        >
          <div className="bg-brand-soft p-4 rounded-full">
            <Send className="size-10 text-brand-text" aria-hidden="true" />
          </div>
          <h2 className="font-display text-2xl font-bold">Review & Submit</h2>
          <p className="text-muted-foreground max-w-md">
            Please review your completed steps below. When you&apos;re ready, click Submit to finalize your onboarding.
          </p>

          <div className="w-full max-w-sm space-y-2 pt-4">
            {dataSteps.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left ${isCompleted ? "bg-success-soft" : "bg-muted/50"}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-success-strong shrink-0" aria-hidden="true" />
                  ) : (
                    <StepIcon className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                  )}
                  <span className={`text-sm font-medium ${isCompleted ? "text-success-strong" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  <span className={`ml-auto text-xs ${isCompleted ? "text-success-strong" : "text-muted-foreground"}`}>
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                </div>
              );
            })}

            <div className="flex items-center gap-3 p-3 rounded-lg text-left bg-brand-soft">
              <Shield className="h-5 w-5 text-brand-text shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-brand-text">
                Role: {roleLabel}
              </span>
              <span className="ml-auto text-xs text-brand-text">
                Assigned
              </span>
            </div>
          </div>

          <p className="pt-2 text-sm text-muted-foreground">
            Default leave balances will be allocated upon submission
          </p>

          <div className="flex w-full justify-between gap-3 border-t border-border pt-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            <span title={!allDataStepsComplete ? "Complete all steps before submitting" : undefined}>
              <Button
                onClick={handleSubmit}
                disabled={!allDataStepsComplete}
                loading={isSubmitting}
                aria-describedby={!allDataStepsComplete ? "review-hint" : undefined}
              >
                                Submit
                <ArrowRight aria-hidden="true" />
              </Button>
            </span>
            {!allDataStepsComplete && (
              <p id="review-hint" className="sr-only">Complete all previous steps to enable this button</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
