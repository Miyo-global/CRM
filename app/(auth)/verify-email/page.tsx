"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useVerifyEmail, useResendVerificationEmail } from "@/lib/hooks/auth-hooks";
import { CheckCircle2, Mail, Loader2, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { IconChip } from "@/components/ui/icon-chip";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [isVerified, setIsVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const hasVerified = useRef(false);

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

  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerificationEmail();

  useEffect(() => {
    if (token && !hasVerified.current) {
      hasVerified.current = true;
      verifyEmail.mutate(
        { token },
        {
          onSuccess: () => {
            setIsVerified(true);
            toast.success("Email verified successfully!");
            setTimeout(() => router.push("/signin"), 2000);
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        }
      );
    }
  }, [token, verifyEmail, router]);

  const handleResend = () => {
    if (!email || cooldown > 0) return;
    resendVerification.mutate(
      { email },
      {
        onSuccess: () => {
          toast.success("Verification email resent!");
          startCooldown();
        },
        onError: () => {
          toast.error("Failed to resend email");
        },
      }
    );
  };

  if (isVerified) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-center text-center animate-fade-up">
        <IconChip icon={CheckCircle2} tone="success" size="lg" className="mb-5" />
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Email Verified!</h1>
        <p className="mt-2 text-base text-muted-foreground">Your email has been successfully verified</p>

        <div role="status" aria-live="polite" className="mt-6 w-full rounded-lg bg-success-soft p-4">
          <p className="text-sm text-success-strong">Redirecting you to sign in page...</p>
        </div>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/signin">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  if (verifyEmail.isPending) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-center text-center animate-fade-up">
        <IconChip icon={Loader2} tone="brand" size="lg" className="mb-5 [&_svg]:animate-spin" />
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Verifying Email</h1>
        <p className="mt-2 text-base text-muted-foreground">Please wait while we verify your email address</p>
        <p role="status" className="mt-6 animate-pulse text-sm text-subtle-foreground">This will only take a moment...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center text-center animate-fade-up">
      <IconChip icon={Mail} tone="brand" size="lg" className="mb-5" />
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Check your email</h1>
      <p className="mt-2 text-base text-muted-foreground">
        We&apos;ve sent a verification link to your address. Please click the link to verify your account and get started.
      </p>

      {email && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Verification email sent to</p>
          <p className="mt-1 font-medium text-foreground">{email}</p>
        </div>
      )}

      <div className="mt-6 w-full space-y-3 text-left">
        <div role="status" className="rounded-lg bg-info-soft p-4">
          <p className="text-sm text-info-strong">
            Click the link in the email to verify your account. The link will expire in 24 hours.
          </p>
        </div>

        <aside aria-label="Email delivery help" className="flex items-start gap-2 rounded-lg bg-warning-soft p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden="true" />
          <p className="text-xs text-warning-strong">
            Didn&apos;t receive an email? Check your spam folder or contact support.
          </p>
        </aside>
      </div>

      <div className="mt-6 flex w-full flex-col gap-2">
        <Button asChild size="lg" className="w-full">
          <Link href="/signin">
            <ArrowLeft aria-hidden="true" />
            Back to Sign In
          </Link>
        </Button>
        {email && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleResend}
            loading={resendVerification.isPending}
            disabled={cooldown > 0}
            aria-label={cooldown > 0 ? `Resend available in ${cooldown} seconds` : "Resend verification link"}
          >
            <RefreshCw aria-hidden="true" />
            {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend Verification Link"}
          </Button>
        )}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div role="status" className="flex w-full max-w-[400px] flex-col items-center gap-4 py-8">
      <Loader2 className="size-8 animate-spin text-brand-text" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
