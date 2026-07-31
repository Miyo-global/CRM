"use client";

import { memo } from "react";

type Step = "upload" | "mapping" | "preview";

const STEPS: Step[] = ["upload", "mapping", "preview"];

interface StepIndicatorProps {
  step: Step;
}

export const StepIndicator = memo(function StepIndicator({
  step,
}: StepIndicatorProps) {
  const currentIdx = STEPS.indexOf(step);

  return (
    <div className="flex items-center gap-1 mb-4">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              step === s
                ? "bg-gold text-white"
                : i < currentIdx
                  ? "bg-gold/30 text-gold"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          {i < 2 && <div className="h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
});
