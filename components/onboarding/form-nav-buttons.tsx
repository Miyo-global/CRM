"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface FormNavButtonsProps {
  onBack?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

/** Sticky step footer (§8.6): Back (ghost) left, primary submit right. */
export function FormNavButtons({
  onBack,
  isLoading,
  submitLabel = "Save & Continue",
}: FormNavButtonsProps) {
  return (
    <div
      className={`sticky bottom-0 z-sticky -mx-5 mt-6 flex gap-2 border-t border-border bg-card px-5 py-3 ${
        onBack ? "justify-between" : "justify-end"
      }`}
    >
      {onBack && (
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
      )}
      <Button type="submit" loading={isLoading}>
        {submitLabel}
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}
