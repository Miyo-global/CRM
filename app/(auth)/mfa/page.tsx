"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";
import { CircleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function safeCallbackUrl(): string {
  if (typeof window === "undefined") return "/dashboard";
  const url = new URLSearchParams(window.location.search).get("callbackUrl");
  if (url && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) {
    return url;
  }
  return "/dashboard";
}

export default function MfaChallengePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    } else if (status === "authenticated" && session?.mfaSatisfied === true) {
      router.replace(safeCallbackUrl());
    }
  }, [status, session?.mfaSatisfied, router]);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const trimmed = code.trim();
      const payload = useBackup ? { backupCode: trimmed } : { token: trimmed };
      const res = await fetch("/api/auth/mfa/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Verification failed");
      }
      await update();
      return data;
    },
    onSuccess: () => {
      router.replace(safeCallbackUrl());
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setCode("");
    },
  });

  const canSubmit = useBackup ? code.trim().length > 0 : code.trim().length === 6;

  return (
    <div className="w-full max-w-[400px] animate-fade-up">
      <IconChip icon={ShieldCheck} tone="brand" size="lg" className="mb-5" />
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
        Two-factor authentication
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        {useBackup
          ? "Enter one of your backup codes to continue."
          : "Enter the 6-digit code from your authenticator app."}
      </p>

      {verifyMutation.isError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-lg bg-danger-soft px-4 py-3 text-danger-strong"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">{getErrorMessage(verifyMutation.error)}</p>
        </div>
      )}

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) verifyMutation.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="mfa-code">{useBackup ? "Backup code" : "Authentication code"}</Label>
          <Input
            id="mfa-code"
            autoFocus
            autoComplete="one-time-code"
            inputMode={useBackup ? "text" : "numeric"}
            placeholder={useBackup ? "XXXXXX-XXXXXX" : "000000"}
            value={code}
            onChange={(e) =>
              setCode(useBackup ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className={cn(
              "h-14 text-center font-mono text-2xl tabular-nums",
              useBackup ? "tracking-widest" : "tracking-[0.5em]"
            )}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          loading={verifyMutation.isPending}
          disabled={!canSubmit}
        >
          Verify
        </Button>
      </form>

      <div className="mt-8 flex flex-col items-start gap-2 text-sm">
        <button
          type="button"
          className="rounded-sm font-medium text-brand-text outline-none hover:underline focus-visible:focus-ring"
          onClick={() => {
            setUseBackup((v) => !v);
            setCode("");
          }}
        >
          {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
        </button>
        <button
          type="button"
          className="rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:focus-ring"
          onClick={() => signOut({ callbackUrl: "/signin" })}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
