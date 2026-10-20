"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useUrlToken } from "@/lib/hooks/use-url-token";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getPasswordStrength } from "@/lib/password-utils";
import { PASSWORD_RULES, PASSWORD_ZOD_SCHEMA } from "@/lib/utils/password-validation";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordInput } from "@/components/auth/password-input";
import Link from "next/link";
import { getErrorMessage } from "@/lib/get-error-message";

export const dynamic = "force-dynamic";

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
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

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

const setupSchema = z
  .object({
    password: PASSWORD_ZOD_SCHEMA,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof setupSchema>;

function SetupPasswordContent() {
  const router = useRouter();
  const token = useUrlToken() ?? "";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const strength = useMemo(() => (password ? getPasswordStrength(password) : null), [password]);

  const { data: tokenInfo, isLoading: isValidating, error: tokenError } = useQuery({
    queryKey: ["setup-password", token],
    queryFn: () => apiClient.get<{ email: string; name: string }>("/auth/validate-setup-token", { token }),
    enabled: !!token,
    retry: false,
  });

  const handleSubmit = useCallback(async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        password: values.password,
      });
      toast.success("Password set successfully! You can now sign in.");
      router.push("/signin");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-center text-center">
        <h1 className="mb-2 font-display text-4xl font-extrabold tracking-tight text-foreground">Invalid Link</h1>
        <p className="mb-6 text-base text-muted-foreground">
          This setup link is invalid. Please contact your HR administrator.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/signin">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div role="status" className="w-full max-w-[400px] text-center">
        <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-text" />
        <p className="text-sm text-muted-foreground">Verifying your setup link...</p>
      </div>
    );
  }

  if (tokenError || !tokenInfo) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-center text-center">
        <h1 className="mb-2 font-display text-4xl font-extrabold tracking-tight text-foreground">Link Expired</h1>
        <p className="mb-6 text-base text-muted-foreground">
          This setup link has expired or is no longer valid. Please contact your HR administrator to get a new link.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/signin">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
          Welcome, {tokenInfo.name}!
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Set up your password to complete your account for <strong>{tokenInfo.email}</strong>.
        </p>
      </div>

      <div>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">
              Password
            </Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              className="h-10"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            {strength && <PasswordStrengthIndicator strength={strength} />}
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">
              Confirm Password
            </Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm your password"
              className="h-10"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? (
              "Setting up..."
            ) : (
              <>Complete Setup <ArrowRight className="size-4" /></>
            )}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-xs text-subtle-foreground">
        At least {PASSWORD_RULES.minLength} characters with an uppercase letter, a lowercase letter, a number and a special character or space.
      </p>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="w-full max-w-[400px] text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-brand-text" />
        </div>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  );
}
