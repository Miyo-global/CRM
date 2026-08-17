"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateOrgSettings } from "@/lib/api/hooks/organization";
import { toast } from "sonner";
import { CURRENCIES, TIMEZONES, MONTHS } from "@/features/settings/organization/constants";
import type { OrgSettings } from "@/types/organization";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function CalendarRangeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M17 14h-6" />
      <path d="M13 18H7" />
      <path d="M7 14h.01" />
      <path d="M17 18h.01" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2Z" />
    </svg>
  );
}

interface AppConfigCardProps {
  org: OrgSettings;
}

export function AppConfigCard({ org }: AppConfigCardProps) {
  const [initialized, setInitialized] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [fiscalYearStart, setFiscalYearStart] = useState<string>("");
  const [directoryPublic, setDirectoryPublic] = useState<boolean>(false);
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [loginBgUrl, setLoginBgUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrgSettings();

  if (!initialized && org) {
    setLogoUrl(org.logo ?? "");
    setTimezone(org.timezone ?? DEFAULT_TIMEZONE);
    setCurrency(org.currency ?? "INR");
    setFiscalYearStart(String(org.fiscalYearStart ?? 4));
    setDirectoryPublic(org.directoryPublic ?? false);
    setPrimaryColor(org.primaryColor ?? "");
    setLoginBgUrl(org.loginBgUrl ?? "");
    setInitialized(true);
  }

  const handleStartEdit = useCallback(() => {
    setLogoUrl(org.logo ?? "");
    setTimezone(org.timezone ?? DEFAULT_TIMEZONE);
    setCurrency(org.currency ?? "INR");
    setFiscalYearStart(String(org.fiscalYearStart ?? 4));
    setDirectoryPublic(org.directoryPublic ?? false);
    setPrimaryColor(org.primaryColor ?? "");
    setLoginBgUrl(org.loginBgUrl ?? "");
    setIsEditing(true);
  }, [org]);

  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleLogoUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLogoUrl(e.target.value),
    []
  );

  const handlePrimaryColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value),
    []
  );

  const handleLoginBgUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLoginBgUrl(e.target.value),
    []
  );

  const handleClickUpload = useCallback(() => {
    logoInputRef.current?.click();
  }, []);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "org-logos");
    setLogoUploading(true);
    try {
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setLogoUrl(json.url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(() => {
    const fiscalNum = fiscalYearStart ? parseInt(fiscalYearStart, 10) : undefined;
    const colorVal = primaryColor.trim();
    if (colorVal && !/^#[0-9a-fA-F]{6}$/.test(colorVal)) {
      toast.error("Primary color must be a valid hex color (e.g. #bd882c)");
      return;
    }
    updateOrg(
      {
        logo: logoUrl.trim() || null,
        timezone: timezone || undefined,
        currency: (currency as "USD" | "EUR" | "INR" | "GBP" | "AED") || undefined,
        fiscalYearStart: fiscalNum,
        directoryPublic,
        primaryColor: colorVal || null,
        loginBgUrl: loginBgUrl.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("App configuration saved");
          setIsEditing(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to save configuration");
        },
      }
    );
  }, [logoUrl, timezone, currency, fiscalYearStart, directoryPublic, primaryColor, loginBgUrl, updateOrg]);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 text-gold" />
            App Configuration
          </CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEdit}>
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          Branding, currency, timezone, and fiscal year settings for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Logo */}
        <div className="space-y-1.5">
          <Label htmlFor="logo-url" className="text-sm flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Logo
          </Label>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="logo-url"
                  value={logoUrl}
                  onChange={handleLogoUrlChange}
                  placeholder="https://example.com/logo.png"
                  aria-label="Logo URL"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={logoUploading}
                  onClick={handleClickUpload}
                >
                  {logoUploading ? (
                    <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadIcon className="h-3.5 w-3.5 mr-1" />
                  )}
                  Upload
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" className="h-10 w-auto rounded border border-border object-contain" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {org.logo && (
                <img src={org.logo} alt="Org logo" className="h-8 w-auto rounded border border-border object-contain" />
              )}
              <Input
                id="logo-url"
                value={org.logo ?? ""}
                disabled
                className="bg-muted"
                aria-label="Logo URL"
                placeholder="Not set"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Timezone + Currency side-by-side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="text-sm flex items-center gap-1.5">
              <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Timezone
            </Label>
            {isEditing ? (
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" aria-label="Timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="timezone"
                value={org.timezone ?? DEFAULT_TIMEZONE}
                disabled
                className="bg-muted"
                aria-label="Timezone"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-sm flex items-center gap-1.5">
              <DollarSignIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Default Currency
            </Label>
            {isEditing ? (
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" aria-label="Default currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="currency"
                value={org.currency ?? "INR"}
                disabled
                className="bg-muted"
                aria-label="Default currency"
              />
            )}
          </div>
        </div>

        {/* Fiscal Year Start */}
        <div className="space-y-1.5">
          <Label htmlFor="fiscal-year" className="text-sm flex items-center gap-1.5">
            <CalendarRangeIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Fiscal Year Start
          </Label>
          {isEditing ? (
            <Select value={fiscalYearStart} onValueChange={setFiscalYearStart}>
              <SelectTrigger id="fiscal-year" aria-label="Fiscal year start month" className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="fiscal-year"
              value={MONTHS.find((m) => m.value === (org.fiscalYearStart ?? 4))?.label ?? "April"}
              disabled
              className="bg-muted w-48"
              aria-label="Fiscal year start month"
            />
          )}
        </div>

        <Separator />

        {/* Public Employee Directory */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
              Public Employee Directory
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow members to view the full employee directory. When off, only HR and admins can browse it.
            </p>
          </div>
          <Switch
            checked={isEditing ? directoryPublic : (org.directoryPublic ?? false)}
            onCheckedChange={isEditing ? setDirectoryPublic : () => undefined}
            disabled={!isEditing}
            aria-label="Public employee directory"
          />
        </div>

        <Separator />

        {/* Branding */}
        <div className="space-y-3">
          <Label className="text-sm flex items-center gap-1.5 font-semibold">
            <PaletteIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Branding
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="primary-color" className="text-sm text-muted-foreground">Primary Color</Label>
              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <Input
                    id="primary-color"
                    value={primaryColor}
                    onChange={handlePrimaryColorChange}
                    placeholder="#bd882c"
                    className="flex-1 font-mono text-sm"
                    aria-label="Primary brand color"
                  />
                  {primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) && (
                    <div className="h-8 w-8 rounded border border-border shrink-0" style={{ backgroundColor: primaryColor }} />
                  )}
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input value={org.primaryColor ?? ""} disabled className="bg-muted flex-1 font-mono text-sm" placeholder="Not set" />
                  {org.primaryColor && (
                    <div className="h-8 w-8 rounded border border-border shrink-0" style={{ backgroundColor: org.primaryColor }} />
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-bg" className="text-sm text-muted-foreground">Login Page Background URL</Label>
              {isEditing ? (
                <Input
                  id="login-bg"
                  value={loginBgUrl}
                  onChange={handleLoginBgUrlChange}
                  placeholder="https://example.com/bg.jpg"
                  aria-label="Login background image URL"
                />
              ) : (
                <Input value={org.loginBgUrl ?? ""} disabled className="bg-muted text-sm" placeholder="Not set" />
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={isUpdating} size="sm">
              {isUpdating ? (
                <>
                  <LoaderIcon className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
