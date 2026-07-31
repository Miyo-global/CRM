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
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
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
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-5 sm:mb-8">
          <div className="mx-auto h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Check Your Email</h1>
          <p className="text-muted-foreground mt-2">Password reset instructions sent</p>
        </div>

        <div className="rounded-xl border bg-card shadow-soft p-4 sm:p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">We have sent a password reset link to</p>
            <p className="font-medium text-foreground mt-1">{form.getValues("email")}</p>
          </div>

          <div role="status" className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-600">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
          </div>

          <aside aria-label="Email delivery help" className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-xs text-amber-600">
              Can&apos;t find the email? Check your spam or junk folder. The email is sent from noreply@miyoglobal.com.
            </p>
          </aside>

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleResend}
            disabled={forgotPassword.isPending || cooldown > 0}
            aria-label={cooldown > 0 ? `Resend available in ${cooldown} seconds` : "Resend reset email"}
          >
            {forgotPassword.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend Reset Email"}
          </Button>

          <Link href="/signin" className="block">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="text-center mb-5 sm:mb-8">
        <div className="mx-auto h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Forgot Password</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your registered email address and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-soft p-4 sm:p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...form.register("email")}
              disabled={forgotPassword.isPending}
              className="h-9 text-sm focus-visible:ring-primary"
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={form.formState.errors.email ? "email-error" : undefined}
            />
            {form.formState.errors.email && (
              <p id="email-error" role="alert" className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/signin" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
