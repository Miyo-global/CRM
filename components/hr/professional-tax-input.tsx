"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PT_ANNUAL_CAP } from "@/lib/payroll/rules";

export const PT_LABEL = "Professional Tax (monthly)";
export const PT_HELPER_TEXT =
  "Monthly PT deducted from this employee's salary. Varies by state; enter 0 or leave blank if not applicable.";

/**
 * ₹-prefixed amount box for monthly PT. Props (id, aria-*) land on the
 * <input>, so it works inside FormControl and with a plain <Label htmlFor>.
 * The raw text is kept as typed; ptAmountSchema decides what is valid.
 */
export function ProfessionalTaxInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className="relative w-full">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
      >
        &#8377;
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        maxLength={10}
        className={cn("h-11 pl-8 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}

/** "Not applicable" toggle; a 44px row so it is easy to tap on a phone. */
export function ProfessionalTaxNotApplicable({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      />
      Not applicable
    </label>
  );
}

/**
 * Soft warning when the monthly figure would pass the ₹2,500 constitutional
 * annual limit over a full year. Not an error: one month may be higher.
 */
export function professionalTaxAnnualWarning(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const monthly = Number(raw);
  if (!Number.isFinite(monthly) || monthly * 12 <= PT_ANNUAL_CAP) return null;
  const annual = (monthly * 12).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `₹${annual} a year at this rate is above the ₹${PT_ANNUAL_CAP.toLocaleString("en-IN")} annual PT limit. Check the state's schedule.`;
}
