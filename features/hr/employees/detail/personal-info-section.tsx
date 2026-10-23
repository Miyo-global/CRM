"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { User } from "lucide-react";
import { normalizePersonNameInput, PERSON_NAME_HINT } from "@/lib/utils/person-name";
import type { EmployeeFormValues } from "@/app/(dashboard)/hr/employees/[employeeId]/edit-employee-form";

const PERSON_NAME_MAX_LENGTH = 50;

export function PersonalInfoSection() {
  const { control } = useFormContext<EmployeeFormValues>();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input
                  maxLength={PERSON_NAME_MAX_LENGTH}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(normalizePersonNameInput(e.target.value))}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription className="text-xs">Use {PERSON_NAME_HINT}.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input
                  maxLength={PERSON_NAME_MAX_LENGTH}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(normalizePersonNameInput(e.target.value))}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription className="text-xs">Use {PERSON_NAME_HINT}.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* MIYO-0158: deactivation and termination mail goes here once the
            work inbox is closed. */}
        <FormField
          control={control}
          name="personalEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@gmail.com"
                  autoComplete="off"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Used for exit and deactivation mail, after the work address stops working.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <PhoneInput
                  defaultCountry="IN"
                  placeholder="Enter phone number"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
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
      </div>
    </div>
  );
}
