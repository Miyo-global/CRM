"use client";

import { isSignupEnabled } from "@/lib/auth/signup-enabled";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, CircleAlert, Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { signInThrownMessage } from "@/lib/auth/sign-in-error";

export const dynamic = "force-dynamic";

const signinSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof signinSchema>;


export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  // An accepted invitation that could not sign in directly lands here with
  // the address prefilled (QA-BUG-04).
  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get("email");
    if (email) form.setValue("email", email);
  }, [form]);

  const getCallbackUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      if (url && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return url;
    }
    return "/dashboard";
  };

  const signInMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!navigator.onLine) {
        throw new Error("No internet connection. Check your network and try again.");
      }
      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          callbackUrl: getCallbackUrl(),
          redirect: false,
        });
        if (result?.error) {
          // The one case worth naming: the account exists but the first day
          // has not arrived (QA-0070).
          if (result.code === "before_joining_date") {
            throw new Error(
              "Your account opens on your joining date. Contact HR if you need access sooner.",
            );
          }
          // Same text for every failure so it reveals nothing, with a next
          // step for a deactivated or disabled account (R2-ROLE-1).
          throw new Error(
            "Invalid email or password. If you still cannot sign in, contact your administrator.",
          );
        }
        return result;
      } catch (error) {
        const message = signInThrownMessage(error);
        throw message ? new Error(message) : error;
      }
    },
    onSuccess: (result) => {
      toast.success("Welcome back!");
      if (result?.ok) {
        const target =
          result.url && result.url.length > 0 ? result.url : getCallbackUrl();
        window.location.href = target;
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const googleSignInMutation = useMutation({
    mutationFn: async () => {
      await signIn("google", { callbackUrl: getCallbackUrl() });
    },
    onError: () => {
      toast.error("Google sign-in failed. Please try again.");
    },
  });

  const isPending = signInMutation.isPending;

  const hasGoogleProvider = !!process.env.NEXT_PUBLIC_GOOGLE_ENABLED;

  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Use your work email to reach your HR, projects and timesheets.
        </p>
      </div>

      {/* One generic failure message: a separate "account locked" banner told
          an attacker the address exists (QA-0037). A lock is announced to the
          account owner by email instead. */}
      {signInMutation.isError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-lg bg-danger-soft px-4 py-3 text-danger-strong"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">{getErrorMessage(signInMutation.error)}</p>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit((v) => signInMutation.mutate(v))}
        aria-busy={isPending}
        noValidate
        className="flex flex-col gap-4"
        // A failed attempt's banner used to sit above new field errors until
        // the next submit (QA-D006).
        onChange={() => {
          if (signInMutation.isError) signInMutation.reset();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@miyoglobal.com"
            {...form.register("email")}
            disabled={isPending}
            className="h-10"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? "email-error" : undefined}
          />
          {form.formState.errors.email && (
            <p id="email-error" role="alert" className="text-xs text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div
            className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1.5"
            style={{ gridTemplateAreas: '"label forgot" "input input"' }}
          >
            <Label htmlFor="password" className="[grid-area:label] self-center">
              Password
            </Label>
            <div className="relative [grid-area:input]">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                {...form.register("password")}
                disabled={isPending}
                className="h-10 pr-9 hide-native-password-reveal"
                aria-invalid={!!form.formState.errors.password}
                aria-describedby={form.formState.errors.password ? "pw-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:focus-ring"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <Link
              href="/forgot-password"
              className="[grid-area:forgot] self-center justify-self-end rounded-sm text-sm font-medium text-brand-text outline-none hover:underline focus-visible:focus-ring"
            >
              Forgot password?
            </Link>
          </div>
          {form.formState.errors.password && (
            <p id="pw-error" role="alert" className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" loading={isPending} className="mt-2 w-full">
          {isPending ? (
            "Signing in…"
          ) : (
            <>
              Sign in
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      {hasGoogleProvider && (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-subtle-foreground">or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => googleSignInMutation.mutate()}
            loading={googleSignInMutation.isPending}
            disabled={isPending}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img src="/google-g.svg" alt="" aria-hidden="true" className="size-4" />
            Continue with Google
          </Button>
        </>
      )}

      <div className="mt-8 space-y-3">
        {isSignupEnabled() && (
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand-text hover:underline">
              Sign up free
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
