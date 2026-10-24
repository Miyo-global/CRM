"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CreditCard } from "lucide-react";
import type { EmployeeFormValues } from "@/app/(dashboard)/hr/employees/[employeeId]/edit-employee-form";
// Account number, IFSC, SWIFT and holder name are kept as typed; the form
// schema says what is wrong instead of silently dropping characters.
import {
  BANK_NAME_MAX,
  BRANCH_NAME_MAX,
  IBAN_MAX_LENGTH,
} from "@/lib/validations/bank-details";

export function BankDetailsSection() {
  const { control } = useFormContext<EmployeeFormValues>();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Bank Details</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="accountHolder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Holder Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
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
          control={control}
          name="bankAccount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
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
          control={control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
              <FormControl>
                <Input
                  maxLength={BANK_NAME_MAX}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value.replace(/[^A-Za-z0-9&.\s'-]/g, ""))}
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
          control={control}
          name="ifsc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IFSC Code</FormLabel>
              <FormControl>
                <Input
                  className="uppercase"
                  placeholder="SBIN0001234"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
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
          control={control}
          name="branch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch</FormLabel>
              <FormControl>
                <Input
                  maxLength={BRANCH_NAME_MAX}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value.replace(/[^A-Za-z0-9\s,'.-]/g, ""))}
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
          control={control}
          name="swiftCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SWIFT / BIC Code</FormLabel>
              <FormControl>
                <Input
                  className="uppercase"
                  placeholder="HDFCINBB"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription className="text-xs">Optional</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="iban"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>IBAN</FormLabel>
              <FormControl>
                <Input
                  className="uppercase"
                  maxLength={IBAN_MAX_LENGTH}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, IBAN_MAX_LENGTH),
                    )
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription className="text-xs">Optional</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="taxId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax ID (PAN)</FormLabel>
              <FormControl>
                <Input
                  placeholder="ABCDE1234F"
                  className="uppercase"
                  maxLength={10}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                    field.onChange(next);
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
      </div>
    </div>
  );
}
