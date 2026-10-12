import { Fragment } from "react";

import { cn } from "@/lib/utils";
import { toneDot, toneSoft, type Tone } from "@/lib/design/tones";
import type { PayrollWithUser } from "@/types/hr";

const STEPS: { status: string; label: string; tone: Tone }[] = [
  { status: "DRAFT", label: "Draft", tone: "neutral" },
  { status: "PENDING_APPROVAL", label: "Pending approval", tone: "warning" },
  { status: "APPROVED", label: "Approved", tone: "info" },
  { status: "PAID", label: "Paid", tone: "success" },
];

/** Run status stepper for the selected period (Appendix A `/hr/payroll`): record count per stage. */
export function PayrollRunStepper({
  payrolls,
  className,
}: {
  payrolls: Pick<PayrollWithUser, "status">[];
  className?: string;
}) {
  const counts = new Map<string, number>();
  for (const p of payrolls) {
    const key = String(p.status ?? "DRAFT");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (
    <ol
      aria-label="Payroll run status"
      className={cn("flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-card px-4 py-3", className)}
    >
      {STEPS.map((step, i) => {
        const n = counts.get(step.status) ?? 0;
        return (
          <Fragment key={step.status}>
            {i > 0 && <li aria-hidden="true" className="h-px min-w-4 flex-1 bg-border" />}
            <li className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  n > 0 ? toneSoft[step.tone] : "bg-muted text-subtle-foreground",
                )}
              >
                {n}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <span className={cn("size-1.5 rounded-full", n > 0 ? toneDot[step.tone] : "bg-ink-300")} aria-hidden="true" />
                <span className={n > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>{step.label}</span>
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
