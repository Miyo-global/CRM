"use client";

import { useState, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Monitor, Mail, Bell, BellOff, Smartphone, Moon, Rows3 } from "lucide-react";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/api/hooks/hr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioCard } from "@/components/ui/radio-group";
import { THEME_OPTIONS, useMountedTheme, type ThemeValue } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { SettingsSection, SettingRow } from "./settings-row";

interface PrefRowProps {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}

const NOTIFICATION_CATEGORIES = [
  { key: "lead_assigned", label: "Lead assigned", description: "When a lead is assigned to you." },
  { key: "lead_converted", label: "Lead converted", description: "When a lead you own is converted." },
  { key: "deal_stage_change", label: "Deal stage changes", description: "When a deal moves to a new pipeline stage." },
  { key: "sla_breach", label: "SLA breach warnings", description: "When a lead or ticket is about to breach SLA." },
  { key: "leave_request", label: "Leave requests", description: "When someone submits a leave request for your approval." },
  { key: "leave_decision", label: "Leave approved/rejected", description: "When your leave request is approved or rejected." },
  { key: "expense_approved", label: "Expense approved", description: "When your expense claim is approved or rejected." },
  { key: "payslip_generated", label: "Payslip generated", description: "When your monthly payslip is ready." },
  { key: "holiday_reminder", label: "Holiday reminders", description: "Reminders about upcoming holidays." },
  { key: "target_achieved", label: "Target achieved", description: "When you hit a sales or performance target." },
];

function PrefRow({ id, icon: Icon, label, description, checked, onCheckedChange, disabled }: PrefRowProps) {
  return (
    <SettingRow
      htmlFor={id}
      title={label}
      description={description}
      icon={
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
      }
      control={
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={label}
        />
      }
    />
  );
}

/** Mini app preview for a theme option; fixed ink/gold scale so it previews the target theme, not the current one. */
function ThemePreview({ value }: { value: ThemeValue }) {
  const pane = (dark: boolean) => (
    <div className={cn("flex h-full flex-1", dark ? "bg-ink-950" : "bg-ink-50")}>
      <div className="flex w-1/4 flex-col gap-1 bg-ink-900 p-1.5">
        <span className="size-1.5 rounded-full bg-gold-400" />
        <span className="h-1 w-full rounded-full bg-ink-700" />
        <span className="h-1 w-3/4 rounded-full bg-ink-700" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <span className={cn("h-1.5 w-1/2 rounded-full", dark ? "bg-ink-600" : "bg-ink-300")} />
        <div className={cn("flex-1 rounded-sm border", dark ? "border-ink-800 bg-ink-900" : "border-ink-200 bg-ink-100")} />
        <span className="h-1.5 w-1/3 rounded-full bg-gold-400" />
      </div>
    </div>
  );
  return (
    <div aria-hidden className="flex h-20 overflow-hidden rounded-md border border-border">
      {value === "system" ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(value === "dark")
      )}
    </div>
  );
}

export function SettingsPreferences() {
  const [compactView, setCompactView] = useState(false);
  const { theme, setTheme } = useMountedTheme();

  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const isPending = updatePrefs.isPending;

  const handleCompactToggle = useCallback((checked: boolean) => {
    setCompactView(checked);
    document.documentElement.classList.toggle("compact", checked);
    toast.success(checked ? "Compact view enabled" : "Compact view disabled");
  }, []);

  const handlePrefUpdate = useCallback((field: string, value: boolean | string | null) => {
    updatePrefs.mutate(
      { [field]: value } as Parameters<typeof updatePrefs.mutate>[0],
      { onError: () => toast.error("Failed to save preference") }
    );
  }, [updatePrefs]);

  const handleInAppChange = useCallback((v: boolean) => handlePrefUpdate("inAppEnabled", v), [handlePrefUpdate]);
  const handleEmailChange = useCallback((v: boolean) => handlePrefUpdate("emailEnabled", v), [handlePrefUpdate]);
  const handlePushChange = useCallback((v: boolean) => handlePrefUpdate("pushEnabled", v), [handlePrefUpdate]);
  const handleSmsChange = useCallback((v: boolean) => handlePrefUpdate("smsEnabled", v), [handlePrefUpdate]);

  const [qhStart, setQhStart] = useState(prefs?.quietHoursStart ?? "");
  const [qhEnd, setQhEnd] = useState(prefs?.quietHoursEnd ?? "");

  const handleQhStartChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQhStart(e.target.value), []);
  const handleQhEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQhEnd(e.target.value), []);

  const saveQuietHours = useCallback(() => {
    updatePrefs.mutate(
      { quietHoursStart: qhStart || null, quietHoursEnd: qhEnd || null },
      {
        onSuccess: () => toast.success("Quiet hours saved"),
        onError: () => toast.error("Failed to save quiet hours"),
      }
    );
  }, [updatePrefs, qhStart, qhEnd]);

  const handleClearQuietHours = useCallback(() => {
    setQhStart("");
    setQhEnd("");
    updatePrefs.mutate(
      { quietHoursStart: null, quietHoursEnd: null },
      { onSuccess: () => toast.success("Quiet hours cleared") }
    );
  }, [updatePrefs]);

  const handleCategoryUpdate = useCallback((key: string, value: boolean) => {
    updatePrefs.mutate(
      { categories: { ...(prefs?.categories ?? {}), [key]: value } },
      { onError: () => toast.error("Failed to save") }
    );
  }, [updatePrefs, prefs?.categories]);

  return (
    <div className="space-y-6">
      <SettingsSection title="Appearance" description="Theme and density for this device.">
        <div className="px-5 py-4">
          <p id="theme-label" className="text-sm font-medium text-foreground">Theme</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Light, dark, or follow your system setting.</p>
          <RadioGroup
            aria-labelledby="theme-label"
            value={theme ?? ""}
            onValueChange={(v) => setTheme(v as ThemeValue)}
            className="mt-3 grid-cols-1 sm:grid-cols-3"
          >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <RadioCard key={value} value={value} aria-label={`${label} theme`} className="space-y-2 p-2">
                <ThemePreview value={value} />
                <span className="flex items-center gap-1.5 px-1 pb-0.5 text-sm font-medium text-foreground">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {label}
                </span>
              </RadioCard>
            ))}
          </RadioGroup>
        </div>
        <PrefRow
          id="compact-view"
          icon={Rows3}
          label="Compact view"
          description="Tighter rows and cards to fit more on screen."
          checked={compactView}
          onCheckedChange={handleCompactToggle}
        />
      </SettingsSection>

      <SettingsSection title="Notification Channels">
        <PrefRow
          id="in-app-notifications"
          icon={Bell}
          label="In-app notifications"
          description="Show notifications in the notification bell."
          checked={prefs?.inAppEnabled ?? true}
          onCheckedChange={handleInAppChange}
          disabled={isPending}
        />
        <PrefRow
          id="email-notifications"
          icon={Mail}
          label="Email notifications"
          description="Receive important updates and alerts via email."
          checked={prefs?.emailEnabled ?? true}
          onCheckedChange={handleEmailChange}
          disabled={isPending}
        />
        <PrefRow
          id="push-notifications"
          icon={Monitor}
          label="Desktop push notifications"
          description="Receive browser push notifications even when the tab is inactive."
          checked={prefs?.pushEnabled ?? true}
          onCheckedChange={handlePushChange}
          disabled={isPending}
        />
        <PrefRow
          id="sms-notifications"
          icon={Smartphone}
          label="SMS notifications"
          description="Receive critical alerts via SMS (charges may apply)."
          checked={prefs?.smsEnabled ?? false}
          onCheckedChange={handleSmsChange}
          disabled={isPending}
        />
      </SettingsSection>

      <SettingsSection title="Do Not Disturb">
        <SettingRow
          title="Quiet hours"
          description="Push and SMS notifications are silenced during these hours."
          icon={
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Moon className="size-4" aria-hidden />
            </span>
          }
        >
          <div className="mt-3 flex flex-wrap items-center gap-3 sm:pl-11">
            <div className="flex items-center gap-2">
              <Label htmlFor="qh-start" className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
              <Input
                id="qh-start"
                type="time"
                value={qhStart}
                onChange={handleQhStartChange}
                className="h-8 w-28 text-xs tabular-nums"
                aria-label="Quiet hours start time"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="qh-end" className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
              <Input
                id="qh-end"
                type="time"
                value={qhEnd}
                onChange={handleQhEndChange}
                className="h-8 w-28 text-xs tabular-nums"
                aria-label="Quiet hours end time"
              />
            </div>
            <Button size="sm" onClick={saveQuietHours} disabled={isPending} loading={isPending}>
              Save
            </Button>
            {(qhStart || qhEnd) && (
              <Button size="sm" variant="outline" onClick={handleClearQuietHours} disabled={isPending}>
                Clear
              </Button>
            )}
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Notification Categories" description="Toggle specific event types">
        {NOTIFICATION_CATEGORIES.map(({ key, label, description }) => (
          <CategoryPrefRow
            key={key}
            categoryKey={key}
            label={label}
            description={description}
            checked={prefs?.categories?.[key] !== false}
            onUpdate={handleCategoryUpdate}
            disabled={isPending}
          />
        ))}
      </SettingsSection>
    </div>
  );
}

interface CategoryPrefRowProps {
  categoryKey: string;
  label: string;
  description: string;
  checked: boolean;
  onUpdate: (key: string, value: boolean) => void;
  disabled: boolean;
}

function CategoryPrefRow({ categoryKey, label, description, checked, onUpdate, disabled }: CategoryPrefRowProps) {
  const handleChange = useCallback((v: boolean) => onUpdate(categoryKey, v), [categoryKey, onUpdate]);
  return (
    <PrefRow
      id={`cat-${categoryKey}`}
      icon={BellOff}
      label={label}
      description={description}
      checked={checked}
      onCheckedChange={handleChange}
      disabled={disabled}
    />
  );
}
