"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { optionalPhoneSchema } from "@/lib/phone";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { getPasswordStrength } from "@/lib/password-utils";
import { PASSWORD_ZOD_SCHEMA, passwordIdentityIssue } from "@/lib/utils/password-validation";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Eye({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: PASSWORD_ZOD_SCHEMA,
  companyName: z.string().min(1, "Company name is required"),
  phone: optionalPhoneSchema,
}).superRefine((data, ctx) => {
  const message = passwordIdentityIssue(data.password, data);
  if (message) ctx.addIssue({ code: "custom", message, path: ["password"] });
});

type FormValues = z.infer<typeof signupSchema>;

const PLANS = [
  { id: "STARTER", name: "Starter", price: "999", features: ["Up to 10 users", "HR and attendance", "Leave and time off"] },
  { id: "PROFESSIONAL", name: "Professional", price: "2,499", features: ["Up to 50 users", "Everything in Starter", "Projects and timesheets", "Payroll and performance"] },
  { id: "ENTERPRISE", name: "Enterprise", price: "4,999", features: ["Unlimited users", "Everything in Pro", "Custom integrations", "Priority support"] },
];

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState("STARTER");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", companyName: "", phone: "" },
  });

  const password = form.watch("password");

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/signup", { ...data, plan: selectedPlan });
      toast.success("Account created! Signing you in...");

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load so the new session cookie is read fresh
        window.location.href = "/dashboard";
      } else {
        const needsVerification = result?.error?.toLowerCase().includes("verif");
        toast.error(
          needsVerification
            ? "Account created. Please verify your email before signing in."
            : "Account created but auto-login failed. Please sign in manually."
        );
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load so the new session cookie is read fresh
        window.location.href = "/signin";
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] space-y-8">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {step === 1 ? "Choose a plan that fits your team" : "Enter your details to get started"}
        </p>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="grid gap-3">
            {PLANS.map((plan) => (
              <Label key={plan.id} htmlFor={plan.id} className="cursor-pointer">
                <Card className={cn("transition-colors", selectedPlan === plan.id ? "border-primary ring-1 ring-primary" : "hover:border-border-strong")}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        <span className="font-display text-lg font-bold tabular-nums text-brand-text">INR {plan.price}</span>
                        <span className="text-xs text-muted-foreground">/month</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="size-3 text-success-strong" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            ))}
          </RadioGroup>

          <p className="text-xs text-subtle-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>

          <Button onClick={() => setStep(2)} size="lg" className="w-full">
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...form.register("firstName")} aria-invalid={!!form.formState.errors.firstName} placeholder="John" />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...form.register("lastName")} aria-invalid={!!form.formState.errors.lastName} placeholder="Doe" />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" {...form.register("companyName")} aria-invalid={!!form.formState.errors.companyName} placeholder="Acme Corp" />
            {form.formState.errors.companyName && (
              <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Work Email</Label>
            <Input id="email" {...form.register("email")} aria-invalid={!!form.formState.errors.email} type="email" placeholder="john@company.com" />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? "")}
                />
              )}
            />
            {form.formState.errors.phone && (
              <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password" {...form.register("password")} aria-invalid={!!form.formState.errors.password}
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="pr-9 hide-native-password-reveal"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:focus-ring"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {password && <PasswordStrengthIndicator strength={getPasswordStrength(password)} />}
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
            <p className="text-xs text-subtle-foreground">
              8+ chars, uppercase, lowercase, number, special character
            </p>
          </div>

          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button type="submit" size="lg" loading={isSubmitting} className="flex-1">
              {isSubmitting ? "Creating..." : "Start Free Trial"}
            </Button>
          </div>
        </form>
      )}

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="text-brand-text hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
