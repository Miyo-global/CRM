"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { resetPassword } from "@/server/actions/auth-actions";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PASSWORD_REGEX } from "@/lib/password-utils";
import { cn } from "@/lib/utils";
import { toneBar } from "@/lib/design/tones";
import { apiClient } from "@/lib/api-client";

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

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        PASSWORD_REGEX,
        "Must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: toneBar.danger };
  if (score <= 4) return { score: 2, label: "Medium", color: toneBar.warning };
  if (score <= 5) return { score: 3, label: "Strong", color: toneBar.info };
  return { score: 4, label: "Very Strong", color: toneBar.success };
}

function ResetPasswordContent() {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const strength = password ? getPasswordStrength(password) : null;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      if (token) {
        const result = await apiClient.post<{ success: boolean; error?: string }>("/auth/reset-password", {
          token,
          password: values.password,
        });
        if (result.success) {
          toast.success("Password updated successfully!");
          await signOut({ redirect: false });
          router.push("/signin");
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to update password");
        }
      } else {
        const result = await resetPassword(values.password);
        if (result.success) {
          toast.success("Password updated successfully!");
          await update({ forceChangePassword: false });
          await new Promise((resolve) => setTimeout(resolve, 300));
          router.push("/dashboard");
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to update password");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Create a new secure password to regain access to your account.
        </p>
      </div>

      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  {strength && (
                    <div className="mt-1 space-y-1">
                      <div className="flex gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-colors",
                              level <= strength.score ? strength.color : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          strength.score <= 1
                            ? "text-danger-strong"
                            : strength.score <= 2
                              ? "text-warning-strong"
                              : strength.score <= 3
                                ? "text-info-strong"
                                : "text-success-strong"
                        )}
                      >
                        {strength.label}
                      </p>
                    </div>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              {loading ? (
                "Setting up..."
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="w-full max-w-[400px] text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-brand-text" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
