"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { CheckCircle, ArrowLeft, ArrowRight, Check, Loader2, Send, Shield, type LucideIcon } from "lucide-react";
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
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_HR: "Branch HR",
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
      <Card className="border-border text-center py-8">
        <CardContent className="flex flex-col items-center space-y-4">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center space-y-4"
          >
            <motion.div variants={fadeUp} className="bg-green-500/15 p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-500" aria-hidden="true" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold">You&apos;re All Set!</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground max-w-md">
              Your onboarding information has been submitted. The HR team will verify your documents and approve your profile soon.
            </motion.p>

            <motion.div variants={fadeUp} className="w-full max-w-sm space-y-2 pt-4">
              {dataSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 p-3 rounded-lg text-left bg-green-500/10"
                >
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium text-green-600">
                    {step.label}
                  </span>
                  <span className="ml-auto text-xs text-green-600">
                    Completed
                  </span>
                </div>
              ))}

              <div className="flex items-center gap-3 p-3 rounded-lg text-left bg-primary/10">
                <Shield className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-primary">
                  Role: {roleLabel}
                </span>
                <span className="ml-auto text-xs text-primary">
                  Assigned
                </span>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="pt-4">
              <Button onClick={handleGoToDashboard}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border text-center py-8">
      <CardContent className="flex flex-col items-center space-y-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center space-y-4"
        >
          <motion.div variants={fadeUp} className="bg-primary/10 p-4 rounded-full">
            <Send className="h-12 w-12 text-primary" aria-hidden="true" />
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-2xl font-bold">Review & Submit</motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-md">
            Please review your completed steps below. When you&apos;re ready, click Submit to finalize your onboarding.
          </motion.p>

          <motion.div variants={fadeUp} className="w-full max-w-sm space-y-2 pt-4">
            {dataSteps.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left ${isCompleted ? "bg-green-500/10" : "bg-muted/50"}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <StepIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className={`text-sm font-medium ${isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  <span className={`ml-auto text-xs ${isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                </div>
              );
            })}

            <div className="flex items-center gap-3 p-3 rounded-lg text-left bg-primary/10">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-primary">
                Role: {roleLabel}
              </span>
              <span className="ml-auto text-xs text-primary">
                Assigned
              </span>
            </div>
          </motion.div>

          <motion.p variants={fadeUp} className="text-sm text-muted-foreground italic pt-2">
            Default leave balances will be allocated upon submission
          </motion.p>

          <motion.div variants={fadeUp} className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <span title={!allDataStepsComplete ? "Complete all steps before submitting" : undefined}>
              <Button
                onClick={handleSubmit}
                disabled={!allDataStepsComplete || isSubmitting}
                aria-busy={isSubmitting}
                aria-describedby={!allDataStepsComplete ? "review-hint" : undefined}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </span>
            {!allDataStepsComplete && (
              <p id="review-hint" className="sr-only">Complete all previous steps to enable this button</p>
            )}
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
