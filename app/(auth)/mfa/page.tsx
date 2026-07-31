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

export const dynamic = "force-dynamic";

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

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
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gold/10 ring-1 ring-gold/25 flex items-center justify-center text-gold">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Two-factor authentication</h1>
          <p className="text-sm text-muted-foreground">
            {useBackup
              ? "Enter one of your backup codes to continue."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>
      </div>

      <form
        className="space-y-4 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) verifyMutation.mutate();
        }}
      >
        <div className="space-y-2">
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
          />
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit || verifyMutation.isPending}>
          {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            setUseBackup((v) => !v);
            setCode("");
          }}
        >
          {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
        </button>
        <button
          type="button"
          className="text-muted-foreground/70 hover:text-foreground transition-colors"
          onClick={() => signOut({ callbackUrl: "/signin" })}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
