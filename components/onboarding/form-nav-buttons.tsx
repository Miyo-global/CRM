"use client";

import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

interface FormNavButtonsProps {
  onBack?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function FormNavButtons({
  onBack,
  isLoading,
  submitLabel = "Save & Continue",
}: FormNavButtonsProps) {
  return (
    <div className={onBack ? "flex justify-between" : "flex justify-end"}>
      {onBack && (
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}
      <Button type="submit" disabled={isLoading} aria-busy={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
