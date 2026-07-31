"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validations/hr";
import {
  ACCOUNT_HOLDER_MAX,
  BANK_ACCOUNT_NUMBER_MAX,
  BANK_NAME_MAX,
  BRANCH_NAME_MAX,
  IBAN_MAX_LENGTH,
  IFSC_LENGTH,
  PF_UAN_LENGTH,
  SWIFT_CODE_MAX,
} from "@/lib/validations/bank-details";

import { Input } from "../../ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../../ui/form";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepBankingProps {
  form: UseFormReturn<FormValues>;
}

export function StepBanking({ form }: StepBankingProps) {
  return (
    <>
      <StepBankingFields form={form} />
      <div className="pt-2">
        <p className="text-sm font-medium text-muted-foreground mb-3">Statutory Details (Optional)</p>
        <FormField
          control={form.control}
          name="bankDetails.pfUanNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PF / UAN Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. 100123456789"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, PF_UAN_LENGTH);
                    field.onChange(next || undefined);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  maxLength={PF_UAN_LENGTH}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Optional: required only if PF is applicable
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}

function StepBankingFields({ form }: { form: UseFormReturn<FormValues> }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField
        control={form.control}
        name="bankDetails.accountHolder"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Holder Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="Name as per bank records"
                maxLength={ACCOUNT_HOLDER_MAX}
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(e.target.value.replace(/[^A-Za-z\s.'-]/g, ""));
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
        name="bankDetails.bankName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Bank Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. HDFC Bank"
                maxLength={BANK_NAME_MAX}
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(e.target.value.replace(/[^A-Za-z0-9&.\s'-]/g, ""));
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
        name="bankDetails.branch"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Branch Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Hyderabad Main"
                maxLength={BRANCH_NAME_MAX}
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(e.target.value.replace(/[^A-Za-z0-9\s,'.-]/g, ""));
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
        name="bankDetails.accountNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Number <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="1234567890"
                inputMode="numeric"
                maxLength={BANK_ACCOUNT_NUMBER_MAX}
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(
                    e.target.value.replace(/\D/g, "").slice(0, BANK_ACCOUNT_NUMBER_MAX),
                  );
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
        name="bankDetails.ifsc"
        render={({ field }) => (
          <FormItem>
            <FormLabel>IFSC Code <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. SBIN0001234"
                className="uppercase"
                maxLength={IFSC_LENGTH}
                value={field.value ?? ""}
                onChange={(e) => {
                  field.onChange(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, IFSC_LENGTH),
                  );
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
        name="bankDetails.swiftCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>SWIFT / BIC Code</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. HDFCINBB"
                className="uppercase"
                maxLength={SWIFT_CODE_MAX}
                value={field.value ?? ""}
                onChange={(e) => {
                  const next = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, SWIFT_CODE_MAX);
                  field.onChange(next || undefined);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription className="text-xs">Optional — for international transfers</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="bankDetails.iban"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>IBAN</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. DE89370400440532013000"
                className="uppercase"
                maxLength={IBAN_MAX_LENGTH}
                value={field.value ?? ""}
                onChange={(e) => {
                  const next = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, IBAN_MAX_LENGTH);
                  field.onChange(next || undefined);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription className="text-xs">Optional — for international accounts</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
