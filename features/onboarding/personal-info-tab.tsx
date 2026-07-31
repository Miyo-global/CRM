"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updatePersonalDetails } from "@/server/actions/onboarding-actions";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useOnboardingSubmit } from "@/lib/hooks/use-onboarding-submit";
import { FormNavButtons } from "@/components/onboarding/form-nav-buttons";
import type { Variants } from "framer-motion";

const MAX_EXPERIENCE_YEARS = 60;

const personalSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => isValidPhoneNumber(val), "Invalid phone number"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Please select a gender" }),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date of birth")
    .refine((v) => {
      const dob = new Date(v);
      const now = new Date();
      const min = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
      const max = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
      return dob >= min && dob <= max;
    }, "Date of birth must be a realistic age (16–100 years)"),
  experienceYears: z
    .string()
    .min(1, "Experience is required")
    .refine((v) => Number(v) >= 0, "Experience cannot be negative")
    .refine((v) => Number(v) <= MAX_EXPERIENCE_YEARS, `Experience cannot exceed ${MAX_EXPERIENCE_YEARS} years`),
  skills: z
    .string()
    .min(3, "Add at least one skill")
    .refine(
      (val) => val.split(",").map((s) => s.trim()).filter(Boolean).length > 0,
      "Add at least one skill",
    ),
});

type PersonalFormValues = z.infer<typeof personalSchema>;

interface PersonalInfoTabProps {
  onComplete: (values: Record<string, string | undefined>) => void;
  defaultValues?: Record<string, string | undefined>;
}

const staggerVariants = staggerContainer as Variants;
const fadeUpVariants = fadeUp as Variants;

export function PersonalInfoTab({ onComplete, defaultValues }: PersonalInfoTabProps) {
  const { isLoading, handleSubmit } = useOnboardingSubmit(updatePersonalDetails, {
    successMessage: "Personal details saved!",
    onSuccess: onComplete,
  });
  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      phone: "",
      gender: undefined,
      dateOfBirth: "",
      experienceYears: "",
      skills: "",
      ...defaultValues,
    },
  });

  const { errors } = form.formState;

  return (
    <div>
      <motion.div variants={staggerVariants} initial="hidden" animate="visible">
        <motion.div variants={fadeUpVariants} className="mb-5">
          <h2 className="text-xl font-semibold text-foreground">Welcome to Miyo Global!</h2>
          <p className="text-sm text-muted-foreground mt-1">Tell us a bit about yourself to get started.</p>
        </motion.div>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <motion.div variants={fadeUpVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      id="phone"
                      defaultCountry="IN"
                      placeholder="Enter phone number"
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? "")}
                      aria-required="true"
                      aria-invalid={!!errors.phone}
                    />
                  )}
                />
                {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Controller
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <DatePicker
                      id="dateOfBirth"
                      value={field.value}
                      onChange={field.onChange}
                      toDate={new Date()}
                      placeholder="Select date of birth"
                    />
                  )}
                />
                {errors.dateOfBirth && <p role="alert" className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
              </div>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Controller
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="gender" className="w-full" aria-required="true" aria-invalid={!!errors.gender}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other / Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gender && <p role="alert" className="text-xs text-destructive">{errors.gender.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  {...form.register("experienceYears")}
                  type="number"
                  step="0.1"
                  min="0"
                  max={MAX_EXPERIENCE_YEARS}
                  inputMode="decimal"
                  placeholder="e.g. 2.5"
                  aria-required="true"
                  aria-invalid={!!errors.experienceYears}
                />
                {errors.experienceYears && <p role="alert" className="text-xs text-destructive">{errors.experienceYears.message}</p>}
              </div>
            </motion.div>

            <motion.div variants={fadeUpVariants} className="space-y-1.5">
              <Label htmlFor="skills">Skills <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
              <Input
                id="skills"
                {...form.register("skills")}
                placeholder="React, Node.js, TypeScript..."
                aria-required="true"
                aria-invalid={!!errors.skills}
              />
              {errors.skills && <p role="alert" className="text-xs text-destructive">{errors.skills.message}</p>}
            </motion.div>

            <motion.div variants={fadeUpVariants}>
              <FormNavButtons isLoading={isLoading} />
            </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
