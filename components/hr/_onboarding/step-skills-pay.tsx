"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validations/hr";

import { Input } from "../../ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepSkillsPayProps {
  form: UseFormReturn<FormValues>;
}

export function StepSkillsPay({ form }: StepSkillsPayProps) {
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
        <h3 className="text-base font-semibold mb-4">Salary Information</h3>
        <FormField
          control={form.control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Salary (CTC) <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">&#8377;</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100_000_000}
                    step={1}
                    placeholder="25000"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        field.onChange(undefined);
                        return;
                      }
                      const digitsOnly = raw.replace(/\D/g, "");
                      if (!digitsOnly) return;
                      field.onChange(Number(digitsOnly));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    className="pl-8"
                  />
                </div>
              </FormControl>
              <FormDescription>
                Salary breakdown: Basic (50%) + HRA (25%) + Special Allowance (25%) - Professional Tax (&#8377;200)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch("monthlySalary") && Number(form.watch("monthlySalary")) > 0 && (
          <div className="mt-4 p-4 bg-muted/40 rounded-lg border text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Basic Pay:</span>
              <span className="font-medium">&#8377;{(Number(form.watch("monthlySalary")) * 0.5).toLocaleString()}</span>
              <span className="text-muted-foreground">HRA:</span>
              <span className="font-medium">&#8377;{(Number(form.watch("monthlySalary")) * 0.25).toLocaleString()}</span>
              <span className="text-muted-foreground">Special Allowance:</span>
              <span className="font-medium">&#8377;{(Number(form.watch("monthlySalary")) * 0.25).toLocaleString()}</span>
              <span className="text-muted-foreground">Professional Tax:</span>
              <span className="font-medium text-red-600">-&#8377;200</span>
              <span className="text-muted-foreground font-semibold border-t pt-2">Net Salary:</span>
              <span className="font-bold text-green-600 border-t pt-2">&#8377;{(Number(form.watch("monthlySalary")) - 200).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
