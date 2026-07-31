"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
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
        <CardHeader className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            ) : (
              <Shield className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-sm font-semibold">Two-Factor Authentication</CardTitle>
            {isEnabled && (
              <Badge variant="secondary" className="ml-auto text-xs bg-green-500/10 text-green-600 border-green-500/20">
                Enabled
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Add an extra layer of security using a TOTP authenticator app like Google Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {step === "idle" && (
            <div className="flex gap-2">
              {isEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStep("disable"); setToken(""); }}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                  Disable MFA
                </Button>
              ) : (
                <Button size="sm" onClick={handleSetup} disabled={setup.isPending}>
                  <Shield className="h-3.5 w-3.5 mr-1.5" />
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
                <div className="inline-block p-2 bg-white rounded-lg border border-border">
                  <Image src={qrData.qrDataUrl} alt="MFA QR Code" width={160} height={160} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded select-all">
                  {qrData.secret}
                </code>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mfa-token" className="text-xs">2. Enter the 6-digit code from your app</Label>
                <div className="flex gap-2">
                  <Input
                    id="mfa-token"
                    value={token}
                    onChange={handleTokenChange}
                    placeholder="000000"
                    className="w-32 text-center font-mono text-sm"
                    maxLength={6}
                  />
                  <Button size="sm" onClick={handleVerify} disabled={verify.isPending || token.length !== 6}>
                    Verify &amp; Enable
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setStep("idle"); setQrData(null); }}>
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
              <div className="flex gap-2">
                <Input
                  value={token}
                  onChange={handleTokenChange}
                  placeholder="000000"
                  className="w-32 text-center font-mono text-sm"
                  maxLength={6}
                  aria-label="TOTP code to disable MFA"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={disable.isPending || token.length !== 6}
                >
                  Disable MFA
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>Cancel</Button>
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
          <div className="grid grid-cols-2 gap-2 my-2 px-4">
            {backupCodes.map((code) => (
              <code key={code} className="text-sm font-mono bg-muted px-3 py-2 rounded text-center tracking-wider">
                {code}
              </code>
            ))}
          </div>
          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
              {copied ? (
                <><Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy All</>
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
