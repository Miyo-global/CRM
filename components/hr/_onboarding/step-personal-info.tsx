"use client";

import { useMemo, useCallback, useState } from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { MIN_EMPLOYEE_AGE_YEARS, onboardEmployeeInputSchema } from "@/lib/validations/hr";
import { format, subYears } from "date-fns";
import { isPersonNameInputCharValid, normalizePersonNameInput } from "@/lib/utils/person-name";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepPersonalInfoProps {
  form: UseFormReturn<FormValues>;
}

const EMAIL_MAX_LENGTH = 254;
const PERSON_NAME_MAX_LENGTH = 50;

export function StepPersonalInfo({ form }: StepPersonalInfoProps) {
  const maxDateOfBirth = useMemo(() => subYears(new Date(), MIN_EMPLOYEE_AGE_YEARS), []);
  const minDateOfBirth = useMemo(() => subYears(new Date(), 100), []);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const handleEmailBlur = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      form.setValue("email", trimmed);
      if (!trimmed || !z.string().email().safeParse(trimmed).success) return;
      setCheckingEmail(true);
      try {
        const res = await apiClient.get<{ exists: boolean }>(
          `/hr/employees/check-email?email=${encodeURIComponent(trimmed)}`,
        );
        if (res.exists) {
          form.setError("email", { message: "This email is already registered in your organisation" });
        }
      } catch {
        // silently ignore network errors — server will validate on submit
      } finally {
        setCheckingEmail(false);
      }
    },
    [form],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="John"
                maxLength={PERSON_NAME_MAX_LENGTH}
                {...field}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!isPersonNameInputCharValid(next)) return;
                  field.onChange(normalizePersonNameInput(next));
                }}
                onBlur={(e) => field.onChange(e.target.value.trim())}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input
                placeholder="Doe"
                maxLength={PERSON_NAME_MAX_LENGTH}
                {...field}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!isPersonNameInputCharValid(next)) return;
                  field.onChange(normalizePersonNameInput(next));
                }}
                onBlur={(e) => field.onChange(e.target.value.trim())}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="john@company.com"
                maxLength={EMAIL_MAX_LENGTH}
                {...field}
                onChange={(e) => {
                  field.onChange(e.target.value.trimStart());
                  if (form.formState.errors.email?.message?.includes("already registered")) {
                    form.clearErrors("email");
                  }
                }}
                onBlur={(e) => handleEmailBlur(e.target.value)}
                aria-describedby={checkingEmail ? "email-checking" : undefined}
              />
            </FormControl>
            {checkingEmail && (
              <p id="email-checking" className="text-[11px] text-muted-foreground">Checking email…</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <PhoneInput defaultCountry="IN" placeholder="Enter phone number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                onChange={(v) => field.onChange(v ? new Date(v) : undefined)}
                fromDate={minDateOfBirth}
                toDate={maxDateOfBirth}
                fromYear={minDateOfBirth.getFullYear()}
                toYear={maxDateOfBirth.getFullYear()}
                placeholder="Select DOB"
              />
            </FormControl>
            <FormDescription className="text-xs">
              Employee must be at least {MIN_EMPLOYEE_AGE_YEARS} years old to join.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="sm:col-span-2">
        <FormField
          control={form.control}
          name="whatsappSameAsPhone"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="text-sm font-normal cursor-pointer">WhatsApp same as phone</FormLabel>
            </FormItem>
          )}
        />
      </div>
      {!form.watch("whatsappSameAsPhone") && (
        <FormField
          control={form.control}
          name="whatsappNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp Number</FormLabel>
              <FormControl>
                <PhoneInput defaultCountry="IN" placeholder="WhatsApp number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Initial Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Leave blank for invite link" {...field} />
            </FormControl>
            <FormDescription className="text-xs">Optional. Employee will set their own if left blank.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
