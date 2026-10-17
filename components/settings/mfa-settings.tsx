"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Shield, ShieldOff, Copy, Check } from "lucide-react";
import { useMfaStatus, useMfaSetup, useMfaVerify, useMfaDisable } from "@/lib/api/hooks/mfa";
import { toast } from "sonner";

export function MfaSettings() {
  const { data: status, isLoading } = useMfaStatus();
  const setup = useMfaSetup();
  const verify = useMfaVerify();
  const disable = useMfaDisable();

  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [qrData, setQrData] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    try {
      const data = await setup.mutateAsync();
      setQrData(data);
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
      }
      setStep("setup");
      setToken("");
    } catch {
      toast.error("Failed to start MFA setup. Please try again.");
    }
  };

  const handleVerify = async () => {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    try {
      await verify.mutateAsync({ token });
      toast.success("MFA enabled successfully");
      setStep("idle");
      setQrData(null);
      setToken("");
      if (backupCodes.length > 0) {
        setShowBackupModal(true);
      }
    } catch {
      toast.error("Invalid code. Please try again.");
    }
  };

  const handleDisable = async () => {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    try {
      await disable.mutateAsync(token);
      toast.success("MFA disabled");
      setStep("idle");
      setToken("");
    } catch {
      toast.error("Failed to disable MFA. Check your code and try again.");
    }
  };

  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [backupCodes]);

  const handleTokenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value.replace(/\D/g, "").slice(0, 6));
  }, []);

  if (isLoading) return null;

  const isEnabled = status?.enabled ?? false;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-sm font-semibold">Two-Factor Authentication</CardTitle>
                {isEnabled && (
                  <StatusPill tone="success" dot className="ml-auto">
                    Enabled
                  </StatusPill>
                )}
              </div>
              <CardDescription className="mt-0.5 text-xs">
                Add an extra layer of security using a TOTP authenticator app like Google Authenticator.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "idle" && (
            <div className="flex gap-2">
              {isEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStep("disable"); setToken(""); }}
                  className="text-destructive border-danger-soft hover:bg-danger-soft hover:text-destructive"
                >
                  <ShieldOff aria-hidden />
                  Disable MFA
                </Button>
              ) : (
                <Button size="sm" onClick={handleSetup} disabled={setup.isPending} loading={setup.isPending}>
                  {!setup.isPending && <Shield aria-hidden />}
                  Enable MFA
                </Button>
              )}
            </div>
          )}

          {step === "setup" && qrData && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  1. Scan this QR code with Google Authenticator or any TOTP app.
                </p>
                <div className="inline-block rounded-lg border border-border bg-card p-4 shadow-xs">
                  <Image src={qrData.qrDataUrl} alt="MFA QR Code" width={160} height={160} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
                <code className="inline-block break-all rounded-sm bg-surface-sunken px-2 py-1 font-mono text-xs select-all">
                  {qrData.secret}
                </code>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mfa-token" className="text-xs">2. Enter the 6-digit code from your app</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="mfa-token"
                    value={token}
                    onChange={handleTokenChange}
                    placeholder="000000"
                    className="w-32 text-center font-mono text-sm tracking-widest tabular-nums"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <Button onClick={handleVerify} disabled={verify.isPending || token.length !== 6} loading={verify.isPending}>
                    Verify &amp; Enable
                  </Button>
                  <Button variant="ghost" onClick={() => { setStep("idle"); setQrData(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === "disable" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter your current authenticator code to disable MFA.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={token}
                  onChange={handleTokenChange}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-32 text-center font-mono text-sm tracking-widest tabular-nums"
                  maxLength={6}
                  aria-label="TOTP code to disable MFA"
                />
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={disable.isPending || token.length !== 6}
                  loading={disable.isPending}
                >
                  Disable MFA
                </Button>
                <Button variant="ghost" onClick={() => setStep("idle")}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={showBackupModal} onOpenChange={setShowBackupModal}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Save Your Backup Codes</SheetTitle>
            <SheetDescription>
              Store these codes in a safe place. Each code can only be used once to sign in if you lose access to your authenticator app.
            </SheetDescription>
          </SheetHeader>
          <div className="mx-4 my-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-sunken p-3">
            {backupCodes.map((code) => (
              <code key={code} className="rounded-sm border border-border bg-card px-3 py-2 text-center font-mono text-sm tracking-wider tabular-nums select-all">
                {code}
              </code>
            ))}
          </div>
          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
              {copied ? (
                <><Check className="text-success-strong" aria-hidden />Copied</>
              ) : (
                <><Copy aria-hidden />Copy All</>
              )}
            </Button>
            <Button className="flex-1" onClick={() => setShowBackupModal(false)}>
              I&apos;ve saved these codes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
