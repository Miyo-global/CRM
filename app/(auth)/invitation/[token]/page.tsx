"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAcceptInvitation } from "@/lib/hooks/auth-hooks";
import { getPasswordStrength, PASSWORD_REGEX } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { PasswordConfirmField } from "@/components/auth/password-confirm-field";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { Users, Mail, User, Lock, Loader2, Eye, EyeOff, ArrowRight, X, Shield } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <X className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          {invitationError instanceof Error ? invitationError.message : "This invitation is invalid or has expired."}
        </p>
        <Button variant="outline" onClick={() => router.push("/signin")}>
          Back to Sign In
        </Button>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground">Verifying your invitation...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-lg"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <Card className="shadow-2xl border-border overflow-hidden">

          <div
            className="relative h-40 flex items-center justify-center overflow-hidden gradient-brand"
          >

            <div className="relative flex items-end gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40" />
              <div className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/50 -mb-1" />
              <div className="w-16 h-16 rounded-full bg-white/25 border-2 border-white/45 flex items-center justify-center">
                <Users className="w-7 h-7 text-white/80" />
              </div>
              <div className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/50 -mb-1" />
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40" />
            </div>

            <div className="absolute top-4 left-6 w-2 h-2 rounded-full bg-white/20" />
            <div className="absolute top-8 right-10 w-3 h-3 rounded-full bg-white/15" />
            <div className="absolute bottom-6 left-12 w-2.5 h-2.5 rounded-full bg-white/15" />
            <div className="absolute top-12 left-20 w-1.5 h-1.5 rounded-full bg-white/25" />
            <div className="absolute bottom-4 right-16 w-2 h-2 rounded-full bg-white/20" />
          </div>

          <CardContent className="px-6 md:px-8 pt-6 pb-8">

            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-3">
                <Mail className="w-6 h-6 text-gold" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Join Organization</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                You&apos;ve been invited to join <span className="font-semibold text-foreground">{invitation.organizationName}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Organization</p>
                <p className="text-sm font-medium text-foreground truncate">{invitation.organizationName}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Role</p>
                </div>
                <p className="text-sm font-medium text-foreground">{invitation.role}</p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-busy={acceptInvitation.isPending}>
              <div className="space-y-2">
                <Label className="text-foreground text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={invitation.email} disabled className="pl-10 bg-muted/30 cursor-not-allowed text-sm" aria-label="Invitation email address" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground text-xs font-medium">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    {...form.register("firstName")}
                    disabled={acceptInvitation.isPending}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground text-xs font-medium">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    {...form.register("lastName")}
                    disabled={acceptInvitation.isPending}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    {...form.register("password")}
                    disabled={acceptInvitation.isPending}
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.password}
                    aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                    className="pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p id="password-error" role="alert" className="text-sm text-destructive">{form.formState.errors.password.message}</p>
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

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  className="w-full gap-2 text-white font-medium h-11 gradient-gold"
                  disabled={acceptInvitation.isPending}
                >
                  {acceptInvitation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Accept Invitation
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 h-10"
                  onClick={() => router.push("/signin")}
                  disabled={acceptInvitation.isPending}
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
              </div>

              <p className="text-[11px] text-center text-muted-foreground pt-2">
                By accepting this invitation, you will have access to shared leads, deal pipelines, and team analytics within this organization.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
