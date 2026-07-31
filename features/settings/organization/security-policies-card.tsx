"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUpdateOrgSecuritySettings } from "@/lib/api/hooks/organization";
import { toast } from "sonner";
import type { OrgSettings } from "@/types/organization";


const DOMAIN_REGEX = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

interface DomainBadgeItemProps {
  domain: string;
  onRemove: (domain: string) => void;
}

const DomainBadgeItem = memo(function DomainBadgeItem({ domain, onRemove }: DomainBadgeItemProps) {
  const handleRemove = useCallback(() => onRemove(domain), [onRemove, domain]);
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      @{domain}
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
        aria-label={`Remove ${domain}`}
      >
        <XIcon className="h-3 w-3" />
      </button>
    </Badge>
  );
});


interface SecurityPoliciesCardProps {
  org: OrgSettings;
}

export function SecurityPoliciesCard({ org }: SecurityPoliciesCardProps) {
  const [mfaEnforced, setMfaEnforced] = useState(org.mfaEnforced ?? false);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<string>(String(org.passwordExpiryDays ?? ""));
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>(org.allowedEmailDomains ?? []);
  const [domainInput, setDomainInput] = useState("");
  const domainInputRef = useRef<HTMLInputElement>(null);

  const { mutate: updateSecurity, isPending: isUpdating } = useUpdateOrgSecuritySettings();

  useEffect(() => {
    setMfaEnforced(org.mfaEnforced ?? false);
    setPasswordExpiryDays(String(org.passwordExpiryDays ?? ""));
    setAllowedEmailDomains(org.allowedEmailDomains ?? []);
  }, [org.id, org.mfaEnforced, org.passwordExpiryDays, org.allowedEmailDomains]);

  const handlePasswordExpiryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPasswordExpiryDays(e.target.value),
    []
  );

  const handleDomainInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDomainInput(e.target.value),
    []
  );

  const handleAddDomain = useCallback(() => {
    const domain = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!domain) return;
    if (allowedEmailDomains.includes(domain)) {
      toast.error("That domain is already in the list");
      return;
    }
    if (!DOMAIN_REGEX.test(domain)) {
      toast.error("Enter a valid email domain (e.g. company.com)");
      return;
    }
    setAllowedEmailDomains((prev) => [...prev, domain]);
    setDomainInput("");
    domainInputRef.current?.focus();
  }, [domainInput, allowedEmailDomains]);

  const handleRemoveDomain = useCallback((domain: string) => {
    setAllowedEmailDomains((prev) => prev.filter((d) => d !== domain));
  }, []);

  const handleDomainKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddDomain();
      }
    },
    [handleAddDomain]
  );

  const handleSave = useCallback(() => {
    const expiryDaysNum = passwordExpiryDays ? parseInt(passwordExpiryDays, 10) : null;
    if (passwordExpiryDays && (isNaN(expiryDaysNum!) || expiryDaysNum! < 30 || expiryDaysNum! > 365)) {
      toast.error("Password expiry must be between 30 and 365 days");
      return;
    }
    updateSecurity(
      { mfaEnforced, passwordExpiryDays: expiryDaysNum, allowedEmailDomains },
      {
        onSuccess: () => toast.success("Security settings saved"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save security settings"),
      }
    );
  }, [mfaEnforced, passwordExpiryDays, allowedEmailDomains, updateSecurity]);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldIcon className="h-4 w-4 text-gold" />
          Security Policies
        </CardTitle>
        <CardDescription>
          Configure authentication and password policies for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Require MFA for all members</Label>
            <p className="text-sm text-muted-foreground">
              Members without MFA enabled will be redirected to set it up on their next login.
            </p>
          </div>
          <Switch
            checked={mfaEnforced}
            onCheckedChange={setMfaEnforced}
            aria-label="Require MFA for all members"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="password-expiry" className="text-sm font-medium">
              Password expires every N days
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Leave empty to disable password expiry. Allowed range: 30–365 days.
          </p>
          <Input
            id="password-expiry"
            type="number"
            min={30}
            max={365}
            placeholder="e.g. 90"
            value={passwordExpiryDays}
            onChange={handlePasswordExpiryChange}
            className="w-40"
            aria-label="Password expiry days"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Allowed Email Domains</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Restrict invitations to specific email domains (e.g. <code>company.com</code>). Leave empty to allow any domain.
          </p>
          <div className="flex flex-wrap gap-2 min-h-8">
            {allowedEmailDomains.map((domain) => (
              <DomainBadgeItem key={domain} domain={domain} onRemove={handleRemoveDomain} />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              ref={domainInputRef}
              placeholder="e.g. company.com"
              value={domainInput}
              onChange={handleDomainInputChange}
              onKeyDown={handleDomainKeyDown}
              className="w-full max-w-sm"
              aria-label="Email domain to add"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddDomain}>
              <PlusIcon className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div className="pt-1">
          <Button onClick={handleSave} disabled={isUpdating} size="sm">
            {isUpdating ? (
              <>
                <LoaderIcon className="h-3.5 w-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Security Settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
