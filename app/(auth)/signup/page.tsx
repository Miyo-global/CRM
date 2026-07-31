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

export const dynamic = "force-dynamic";

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

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
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  companyName: z.string().min(1, "Company name is required"),
  phone: optionalPhoneSchema,
});

type FormValues = z.infer<typeof signupSchema>;

const PLANS = [
  { id: "STARTER", name: "Starter", price: "999", features: ["Up to 10 users", "CRM + Lead Pipeline", "Basic HR"] },
  { id: "PROFESSIONAL", name: "Professional", price: "2,499", features: ["Up to 50 users", "Full CRM + AI", "HR + Recruitment", "Projects"] },
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
        window.location.href = "/dashboard";
      } else {
        const needsVerification = result?.error?.toLowerCase().includes("verif");
        toast.error(
          needsVerification
            ? "Account created. Please verify your email before signing in."
            : "Account created but auto-login failed. Please sign in manually."
        );
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
    <div className="w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground mt-1">
          {step === 1 ? "Choose a plan that fits your team" : "Enter your details to get started"}
        </p>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="grid gap-3">
            {PLANS.map((plan) => (
              <Label key={plan.id} htmlFor={plan.id} className="cursor-pointer">
                <Card className={`transition-all ${selectedPlan === plan.id ? "ring-2 ring-gold border-gold" : "hover:border-gold/50"}`}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        <span className="text-lg font-bold text-gold">INR {plan.price}</span>
                        <span className="text-xs text-muted-foreground">/month</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            ))}
          </RadioGroup>

          <p className="text-xs text-center text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>

          <Button onClick={() => setStep(2)} className="w-full">
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name</Label>
              <Input {...form.register("firstName")} placeholder="John" />
              {form.formState.errors.firstName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label>Last Name</Label>
              <Input {...form.register("lastName")} placeholder="Doe" />
              {form.formState.errors.lastName && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Company Name</Label>
            <Input {...form.register("companyName")} placeholder="Acme Corp" />
            {form.formState.errors.companyName && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.companyName.message}</p>
            )}
          </div>

          <div>
            <Label>Work Email</Label>
            <Input {...form.register("email")} type="email" placeholder="john@company.com" />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
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
              <p className="text-xs text-destructive mt-1">{form.formState.errors.phone.message}</p>
            )}
          </div>

          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                {...form.register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              8+ chars, uppercase, lowercase, number, special character
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isSubmitting ? "Creating..." : "Start Free Trial"}
            </Button>
          </div>
        </form>
      )}

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="text-gold hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
