"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { MIN_EMPLOYEE_AGE_YEARS, onboardEmployeeInputSchema } from "@/lib/validations/hr";
import { format, subYears } from "date-fns";
import { normalizePersonNameInput, PERSON_NAME_HINT } from "@/lib/utils/person-name";
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
  const inFlight = useRef<AbortController | null>(null);

  // MIYO-0148: a slow check left "Checking email…" on screen for half a
  // minute. It gives up after 5 seconds, and a new check cancels the last
  // one. Either way the server re-checks on submit.
  useEffect(() => () => inFlight.current?.abort(), []);

  const handleEmailBlur = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      form.setValue("email", trimmed);
      if (!trimmed || !z.string().email().safeParse(trimmed).success) return;

      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      const timeout = setTimeout(() => controller.abort(), 5000);

      setCheckingEmail(true);
      try {
        const res = await apiClient.get<{ exists: boolean }>(
          `/hr/employees/check-email?email=${encodeURIComponent(trimmed)}`,
          undefined,
          { signal: controller.signal },
        );
        if (res.exists) {
          form.setError("email", { message: "This email is already registered in your organisation" });
        }
      } catch {
        // Timed out, cancelled, or offline: let the person carry on.
      } finally {
        clearTimeout(timeout);
        if (inFlight.current === controller) {
          inFlight.current = null;
          setCheckingEmail(false);
        }
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
                onChange={(e) => field.onChange(normalizePersonNameInput(e.target.value))}
                onBlur={(e) => field.onChange(e.target.value.trim())}
              />
            </FormControl>
            <FormDescription className="text-xs">Use {PERSON_NAME_HINT}.</FormDescription>
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
                onChange={(e) => field.onChange(normalizePersonNameInput(e.target.value))}
                onBlur={(e) => field.onChange(e.target.value.trim())}
              />
            </FormControl>
            <FormDescription className="text-xs">Use {PERSON_NAME_HINT}.</FormDescription>
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
              <p id="email-checking" className="text-xs text-muted-foreground">Checking email…</p>
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
      <p className="text-xs text-muted-foreground sm:col-span-2">
        The employee sets their own password from the set-up link in their
        welcome email. No password is set here.
      </p>
    </div>
  );
}
