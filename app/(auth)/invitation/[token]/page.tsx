"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconChip } from "@/components/ui/icon-chip";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAcceptInvitation } from "@/lib/hooks/auth-hooks";
import { getPasswordStrength, PASSWORD_REGEX } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordConfirmField } from "@/components/auth/password-confirm-field";
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, X, Shield } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";

const invitationSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(PASSWORD_REGEX, "Must include uppercase, lowercase, number, and special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type InvitationFormValues = z.infer<typeof invitationSchema>;

export default function InvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { firstName: "", lastName: "", password: "", confirmPassword: "" },
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const { data: invitation, error: invitationError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => apiClient.get<{ email: string; organizationName: string; role: string }>("/auth/invitation", { token }),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (invitationError) {
      const message = invitationError instanceof Error ? invitationError.message : "Invalid invitation";
      toast.error(message);
    }
  }, [invitationError]);

  const acceptInvitation = useAcceptInvitation();

  const onSubmit = (values: InvitationFormValues) => {
    if (!token || !invitation) {
      toast.error("Invalid invitation");
      return;
    }
    acceptInvitation.mutate(
      {
        token,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        password: values.password,
      },
      {
        onSuccess: () => {
          toast.success("Account created! Redirecting to dashboard...");
          router.push("/dashboard");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  };

  if (invitationError) {
    return (
      <div className="flex w-full max-w-[400px] flex-col items-center text-center animate-fade-up">
        <IconChip icon={X} tone="danger" size="lg" className="mb-5" />
        <p className="text-base text-muted-foreground">
          {invitationError instanceof Error ? invitationError.message : "This invitation is invalid or has expired."}
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={() => router.push("/signin")}>
          Back to Sign In
        </Button>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div role="status" className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-brand-text" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Verifying your invitation...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Join Organization</h1>
        <p className="mt-2 text-base text-muted-foreground">
          You&apos;ve been invited to join <span className="font-semibold text-foreground">{invitation.organizationName}</span>
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg bg-brand-soft p-3">
        <IconChip icon={Mail} tone="brand" className="bg-card" />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-wider text-brand-soft-foreground">Organization</p>
            <p className="truncate text-sm font-medium text-foreground">{invitation.organizationName}</p>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider text-brand-soft-foreground">
              <Shield className="size-3" aria-hidden="true" />
              Assigned Role
            </p>
            <p className="truncate text-sm font-medium text-foreground">{invitation.role}</p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" aria-busy={acceptInvitation.isPending}>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={invitation.email} disabled className="h-10 cursor-not-allowed pl-10" aria-label="Invitation email address" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              {...form.register("firstName")}
              disabled={acceptInvitation.isPending}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              {...form.register("lastName")}
              disabled={acceptInvitation.isPending}
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              {...form.register("password")}
              disabled={acceptInvitation.isPending}
              aria-required="true"
              aria-invalid={!!form.formState.errors.password}
              aria-describedby={form.formState.errors.password ? "password-error" : undefined}
              className="h-10 pl-10 pr-10 hide-native-password-reveal"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p id="password-error" role="alert" className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
          {password.length > 0 && <PasswordStrengthIndicator strength={strength} />}
        </div>

        <PasswordConfirmField
          value={confirmPassword}
          onChange={(val) => form.setValue("confirmPassword", val, { shouldDirty: true })}
          password={password}
          disabled={acceptInvitation.isPending}
          showIcon
        />

        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" size="lg" className="w-full" loading={acceptInvitation.isPending}>
            {acceptInvitation.isPending ? (
              "Creating Account..."
            ) : (
              <>
                Accept Invitation
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/signin")}
            disabled={acceptInvitation.isPending}
          >
            <X aria-hidden="true" />
            Decline
          </Button>
        </div>

        <p className="text-xs text-subtle-foreground">
          By accepting this invitation, you will have access to shared leads, deal pipelines, and team analytics within this organization.
        </p>
      </form>
    </div>
  );
}
