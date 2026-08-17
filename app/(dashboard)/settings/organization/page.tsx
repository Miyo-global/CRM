"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Clock, Globe, DollarSign, CalendarRange, Image, Users, X, Plus, Upload, Palette, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrgSettings, useUpdateOrgSettings, useUpdateOrgSecuritySettings } from "@/lib/api/hooks/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { CURRENCIES, TIMEZONES, MONTHS } from "./_lib/constants";
import { PayPolicyCard } from "./_components/pay-policy-card";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

export default function OrganizationSettingsPage() {
  const { data: session } = useSession();
  const { data: org, isLoading } = useOrgSettings();

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [configInitialized, setConfigInitialized] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [fiscalYearStart, setFiscalYearStart] = useState<string>("");
  const [directoryPublic, setDirectoryPublic] = useState<boolean>(false);
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [loginBgUrl, setLoginBgUrl] = useState<string>("");
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const [ipAllowlist, setIpAllowlist] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState("");
  const [ipAllowlistInitialized, setIpAllowlistInitialized] = useState(false);

  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<string>("");
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const domainInputRef = useRef<HTMLInputElement>(null);

  const role = session?.user?.role;
  const canEdit = role === "CEO" || role === "ADMIN";

  const { mutate: updateOrg, isPending: isUpdatingOrg } = useUpdateOrgSettings();
  const { mutate: updateSecurity, isPending: isUpdatingSecurity } = useUpdateOrgSecuritySettings();

  const initSecurity = useCallback(() => {
    if (!securityInitialized && org) {
      setMfaEnforced(org.mfaEnforced ?? false);
      setPasswordExpiryDays(String(org.passwordExpiryDays ?? ""));
      setAllowedEmailDomains(org.allowedEmailDomains ?? []);
      setSecurityInitialized(true);
    }
  }, [securityInitialized, org]);

  const initConfig = useCallback(() => {
    if (!configInitialized && org) {
      setLogoUrl(org.logo ?? "");
      setTimezone(org.timezone ?? DEFAULT_TIMEZONE);
      setCurrency(org.currency ?? "INR");
      setFiscalYearStart(String(org.fiscalYearStart ?? 4));
      setDirectoryPublic(org.directoryPublic ?? false);
      setPrimaryColor(org.primaryColor ?? "");
      setLoginBgUrl(org.loginBgUrl ?? "");
      setConfigInitialized(true);
    }
    if (!ipAllowlistInitialized && org) {
      setIpAllowlist(org.ipAllowlist ?? []);
      setIpAllowlistInitialized(true);
    }
  }, [configInitialized, ipAllowlistInitialized, org]);

  if (!securityInitialized && org) initSecurity();
  if ((!configInitialized || !ipAllowlistInitialized) && org) initConfig();

  const handleStartEdit = useCallback(() => {
    if (!org) return;
    setEditName(org.name);
    setEditSlug(org.slug);
    setIsEditing(true);
  }, [org]);

  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value), []);
  const handleEditSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleSave = useCallback(() => {
    if (!editName.trim()) return;
    updateOrg(
      { name: editName.trim(), slug: editSlug.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Organization updated successfully");
          setIsEditing(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update organization");
        },
      }
    );
  }, [editName, editSlug, updateOrg]);

  const handleStartEditConfig = useCallback(() => {
    if (!org) return;
    setLogoUrl(org.logo ?? "");
    setTimezone(org.timezone ?? DEFAULT_TIMEZONE);
    setCurrency(org.currency ?? "INR");
    setFiscalYearStart(String(org.fiscalYearStart ?? 4));
    setDirectoryPublic(org.directoryPublic ?? false);
    setPrimaryColor(org.primaryColor ?? "");
    setLoginBgUrl(org.loginBgUrl ?? "");
    setIsEditingConfig(true);
  }, [org]);

  const handleCancelEditConfig = useCallback(() => setIsEditingConfig(false), []);

  const handleSaveConfig = useCallback(() => {
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
          setIsEditingConfig(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to save configuration");
        },
      }
    );
  }, [logoUrl, timezone, currency, fiscalYearStart, directoryPublic, primaryColor, loginBgUrl, updateOrg]);

  const handleAddIp = useCallback(() => {
    const ip = ipInput.trim();
    if (!ip || ipAllowlist.includes(ip)) return;
    setIpAllowlist((prev) => [...prev, ip]);
    setIpInput("");
  }, [ipInput, ipAllowlist]);

  const handleRemoveIp = useCallback((ip: string) => {
    setIpAllowlist((prev) => prev.filter((i) => i !== ip));
  }, []);

  const handleSaveIpAllowlist = useCallback(() => {
    updateOrg(
      { ipAllowlist },
      {
        onSuccess: () => toast.success("IP allowlist saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
      }
    );
  }, [ipAllowlist, updateOrg]);

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

  const handleAddDomain = useCallback(() => {
    const domain = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!domain || allowedEmailDomains.includes(domain)) return;
    setAllowedEmailDomains((prev) => [...prev, domain]);
    setDomainInput("");
    domainInputRef.current?.focus();
  }, [domainInput, allowedEmailDomains]);

  const handleRemoveDomain = useCallback((domain: string) => {
    setAllowedEmailDomains((prev) => prev.filter((d) => d !== domain));
  }, []);

  const handleSaveSecurity = useCallback(() => {
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

  if (isLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization details and settings">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (!org) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization details and settings">
        <EmptyState
          illustration={<EmptyProjectsIllustration className="h-32 w-32 opacity-95" />}
          title="No Organization Found"
          description="Please contact your administrator to set up an organization."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Organization" subtitle="Manage your organization details and settings">
      <div className="space-y-6">
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Organization Details</CardTitle>
            <CardDescription>
              Update your workspace name and slug used across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-5">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editName}
                  onChange={handleEditNameChange}
                  aria-label="Organization name"
                />
              ) : (
                <Input id="name" value={org.name} disabled className="bg-muted" aria-label="Organization name" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              {isEditing ? (
                <Input
                  id="slug"
                  value={editSlug}
                  onChange={handleEditSlugChange}
                  aria-label="Organization slug"
                />
              ) : (
                <Input id="slug" value={org.slug} disabled className="bg-muted" aria-label="Organization slug" />
              )}
            </div>
            <div className="flex gap-2">
              {canEdit && !isEditing && (
                <Button variant="outline"
                  disabled={isUpdatingOrg}
                  onClick={handleStartEdit}>
                  Edit Organization
                </Button>
              )}
              {isEditing && (
                <>
                  <Button onClick={handleSave} disabled={isUpdatingOrg || !editName.trim()}>
                    {isUpdatingOrg ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button variant="ghost" onClick={handleCancelEdit} disabled={isUpdatingOrg}>
                    Cancel
                  </Button>
                </>
              )}
              {!canEdit && (
                <p className="text-sm text-muted-foreground">Only Owners and Admins can edit organization settings.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {canEdit && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gold" />
                  App Configuration
                </CardTitle>
                {!isEditingConfig && (
                  <Button variant="outline" size="sm" onClick={handleStartEditConfig}>
                    Edit
                  </Button>
                )}
              </div>
              <CardDescription>
                Branding, currency, timezone, and fiscal year settings for your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="logo-url" className="text-sm flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5 text-muted-foreground" />
                  Logo
                </Label>
                {isEditingConfig ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="logo-url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
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
                        onClick={() => logoInputRef.current?.click()}
                      >
                        {logoUploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1" />
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-sm flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Timezone
                  </Label>
                  {isEditingConfig ? (
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
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    Default Currency
                  </Label>
                  {isEditingConfig ? (
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

              <div className="space-y-1.5">
                <Label htmlFor="fiscal-year" className="text-sm flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                  Fiscal Year Start
                </Label>
                {isEditingConfig ? (
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Public Employee Directory
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow members to view the full employee directory. When off, only HR and admins can browse it.
                  </p>
                </div>
                <Switch
                  checked={isEditingConfig ? directoryPublic : (org.directoryPublic ?? false)}
                  onCheckedChange={isEditingConfig ? setDirectoryPublic : () => undefined}
                  disabled={!isEditingConfig}
                  aria-label="Public employee directory"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm flex items-center gap-1.5 font-semibold">
                  <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                  Branding
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="primary-color" className="text-sm text-muted-foreground">Primary Color</Label>
                    {isEditingConfig ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          id="primary-color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
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
                    {isEditingConfig ? (
                      <Input
                        id="login-bg"
                        value={loginBgUrl}
                        onChange={(e) => setLoginBgUrl(e.target.value)}
                        placeholder="https://example.com/bg.jpg"
                        aria-label="Login background image URL"
                      />
                    ) : (
                      <Input value={org.loginBgUrl ?? ""} disabled className="bg-muted text-sm" placeholder="Not set" />
                    )}
                  </div>
                </div>
              </div>

              {isEditingConfig && (
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveConfig} disabled={isUpdatingOrg} size="sm">
                    {isUpdatingOrg ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Configuration"
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCancelEditConfig} disabled={isUpdatingOrg}>
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canEdit && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-gold" />
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
                  <Clock className="h-4 w-4 text-muted-foreground" />
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
                  onChange={(e) => setPasswordExpiryDays(e.target.value)}
                  className="w-40"
                  aria-label="Password expiry days"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Allowed Email Domains</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Restrict invitations to specific email domains (e.g. <code>company.com</code>). Leave empty to allow any domain.
                </p>
                <div className="flex flex-wrap gap-2 min-h-8">
                  {allowedEmailDomains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="gap-1 pr-1">
                      @{domain}
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(domain)}
                        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                        aria-label={`Remove ${domain}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={domainInputRef}
                    placeholder="e.g. company.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDomain(); } }}
                  className="w-full max-w-sm"
                    aria-label="Email domain to add"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddDomain}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="pt-1">
                <Button onClick={handleSaveSecurity} disabled={isUpdatingSecurity} size="sm">
                  {isUpdatingSecurity ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Security Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {canEdit && <PayPolicyCard minMonthlySalary={org.minMonthlySalary} />}

        {canEdit && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4 text-gold" />
                IP Allowlist
              </CardTitle>
              <CardDescription>
                Restrict dashboard access to specific IP addresses or prefixes. Leave empty to allow access from any IP.
                Add exact IPs (e.g. <code>203.0.113.5</code>) or prefixes (e.g. <code>192.168.1.</code>).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-8">
                {ipAllowlist.map((ip) => (
                  <Badge key={ip} variant="secondary" className="gap-1 pr-1 font-mono text-xs">
                    {ip}
                    <button
                      type="button"
                      onClick={() => handleRemoveIp(ip)}
                      className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                      aria-label={`Remove ${ip}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {ipAllowlist.length === 0 && (
                  <span className="text-xs text-muted-foreground">No IP restrictions — all IPs allowed.</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 203.0.113.5 or 192.168.1."
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddIp(); } }}
                  className="w-full max-w-sm font-mono text-sm"
                  aria-label="IP address or prefix to add"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddIp}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
              <div className="pt-1">
                <Button onClick={handleSaveIpAllowlist} disabled={isUpdatingOrg} size="sm">
                  {isUpdatingOrg ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save IP Allowlist"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
