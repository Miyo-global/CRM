"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForgotPassword } from "@/lib/hooks/auth-hooks";
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import { getErrorMessage } from "@/lib/get-error-message";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const forgotPassword = useForgotPassword();

  const onSubmit = (values: ForgotPasswordFormValues) => {
    forgotPassword.mutate({ email: values.email }, {
      onSuccess: () => {
        setSent(true);
        startCooldown();
        toast.success("Password reset email sent! Check your inbox.");
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    const email = form.getValues("email");
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error("Please enter a valid email");
      return;
    }
    forgotPassword.mutate({ email: parsed.data.email }, {
      onSuccess: () => {
        toast.success("Password reset email resent!");
        startCooldown();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  if (sent) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-center text-center animate-fade-up">
        <IconChip icon={CheckCircle2} tone="success" size="lg" />
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground">
          Check Your Email
        </h1>
        <p className="mt-2 text-base text-muted-foreground">Password reset instructions sent</p>

        <p className="mt-6 text-sm text-muted-foreground">We have sent a password reset link to</p>
        <p className="mt-1 font-medium text-foreground">{form.getValues("email")}</p>

        <div className="mt-6 w-full space-y-3 text-left">
          <div role="status" className="rounded-lg bg-info-soft p-4">
            <p className="text-sm text-info-strong">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
          </div>

          <aside aria-label="Email delivery help" className="flex items-start gap-2 rounded-lg bg-warning-soft p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden="true" />
            <p className="text-xs text-warning-strong">
              Can&apos;t find the email? Check your spam or junk folder. The email is sent from noreply@miyoglobal.com.
            </p>
          </aside>
        </div>

        <div className="mt-6 flex w-full flex-col gap-2">
          <Button size="lg" className="w-full" asChild>
            <Link href="/signin">
              <ArrowLeft aria-hidden="true" />
              Back to Sign In
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleResend}
            loading={forgotPassword.isPending}
            disabled={cooldown > 0}
            aria-label={cooldown > 0 ? `Resend available in ${cooldown} seconds` : "Resend reset email"}
          >
            <RefreshCw aria-hidden="true" />
            {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend Reset Email"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] animate-fade-up">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Forgot Password</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Enter your registered email address and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      {forgotPassword.isError && (
        <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-lg bg-danger-soft px-4 py-3 text-danger-strong">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">{getErrorMessage(forgotPassword.error)}</p>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...form.register("email")}
            disabled={forgotPassword.isPending}
            className="h-10"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? "email-error" : undefined}
          />
          {form.formState.errors.email && (
            <p id="email-error" role="alert" className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={forgotPassword.isPending}>
          {forgotPassword.isPending ? (
            "Sending..."
          ) : (
            <>
              Send Reset Link
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <Link
        href="/signin"
        className="mt-8 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-brand-text outline-none hover:underline focus-visible:focus-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Sign In
      </Link>
    </div>
  );
}
