"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validations/hr";

import { Input } from "../../ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";

import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { splitEarnings } from "@/lib/payroll/rules";
import { ptAmountSchema } from "@/lib/validations/professional-tax";
import {
  PT_HELPER_TEXT,
  PT_LABEL,
  ProfessionalTaxInput,
  ProfessionalTaxNotApplicable,
  professionalTaxAnnualWarning,
} from "@/components/hr/professional-tax-input";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepSkillsPayProps {
  form: UseFormReturn<FormValues>;
}

export function StepSkillsPay({ form }: StepSkillsPayProps) {
  const salaryEntered = Number(form.watch("monthlySalary")) || 0;
  const earnings = splitEarnings(salaryEntered);
  const ptRaw = form.watch("professionalTax") as unknown;
  const ptParsed = ptAmountSchema.safeParse(ptRaw);
  const pt = ptParsed.success ? ptParsed.data ?? 0 : 0;
  const ptNotApplicable = ptRaw === null;
  const ptWarning = typeof ptRaw === "string" && ptParsed.success ? professionalTaxAnnualWarning(ptRaw) : null;

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="skills"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Skills (Comma Separated)</FormLabel>
            <FormControl>
              <Input
                placeholder="React, Node.js, Leadership..."
                maxLength={500}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription>Enter skills separated by commas.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid md:grid-cols-2 gap-5">
        <FormField
          control={form.control}
          name="experienceYears"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Years of Experience</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={0}
                  max={60}
                  placeholder="e.g. 2.5"
                  value={field.value != null ? field.value : ""}
                  onKeyDown={(e) => {
                    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      field.onChange(undefined);
                      return;
                    }
                    const parsed = parseFloat(v);
                    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 60) {
                      field.onChange(parsed);
                    }
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PAN Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  {...field}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    field.onChange(v.slice(0, 10));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="mb-4 text-sm font-semibold">Salary Information</h3>
        <FormField
          control={form.control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Salary (CTC) <span className="text-danger-strong">*</span></FormLabel>
              {/* FormControl on the input itself, not the wrapper, so the label
                  names it ("Monthly Salary (CTC)", not "25000") (FR1-014). */}
              <div className="relative">
                <span aria-hidden className="absolute left-3 top-2.5 text-muted-foreground">&#8377;</span>
                <FormControl>
                  <MoneyInput
                    inputMode="numeric"
                    placeholder="25000"
                    value={field.value as number | undefined}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    className="pl-8"
                  />
                </FormControl>
              </div>
              <FormDescription>
                Basic (50%) + HRA (25%) + Special allowance (25%), less the professional tax below
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Hidden while the amount is invalid: an out-of-range salary rendered a
            nonsense breakdown with negative tax (R3-ONB-08). */}
        {salaryEntered > 0 && !form.formState.errors.monthlySalary && (
          <div className="mt-4 rounded-lg border bg-surface-sunken/40 p-4 text-sm tabular-nums">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <span className="text-muted-foreground">Basic Pay:</span>
              <span className="font-medium">&#8377;{earnings.basicSalary.toLocaleString(DEFAULT_LOCALE)}</span>
              <span className="text-muted-foreground">HRA:</span>
              <span className="font-medium">&#8377;{earnings.hra.toLocaleString(DEFAULT_LOCALE)}</span>
              <span className="text-muted-foreground">Special Allowance:</span>
              <span className="font-medium">&#8377;{earnings.specialAllowance.toLocaleString(DEFAULT_LOCALE)}</span>
              <span className="text-muted-foreground">Professional Tax:</span>
              <span className="font-medium text-danger-strong">-&#8377;{pt.toLocaleString(DEFAULT_LOCALE)}</span>
              <span className="text-muted-foreground font-semibold border-t pt-2">Net Salary:</span>
              <span className="font-bold text-success-strong border-t pt-2">
                &#8377;{(salaryEntered - pt).toLocaleString(DEFAULT_LOCALE)}
              </span>
            </div>
          </div>
        )}

        <h4 className="mt-6 mb-3 text-sm font-semibold">Deductions</h4>
        <FormField
          control={form.control}
          name="professionalTax"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {PT_LABEL}
                <span className="sr-only">, rupees</span>
              </FormLabel>
              <FormControl>
                <ProfessionalTaxInput
                  value={ptNotApplicable ? "" : ((field.value as unknown as string | undefined) ?? "")}
                  disabled={ptNotApplicable}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <ProfessionalTaxNotApplicable
                id="professionalTax-na"
                checked={ptNotApplicable}
                onCheckedChange={(checked) => {
                  field.onChange(checked ? null : "");
                  void form.trigger("professionalTax");
                }}
              />
              <FormDescription>{PT_HELPER_TEXT}</FormDescription>
              {ptWarning && <p className="text-xs text-warning-strong">{ptWarning}</p>}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
