"use client";

import { useState, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Monitor,  Mail, Bell, BellOff, Smartphone, Moon } from "lucide-react";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/api/hooks/hr";
import { Input } from "@/components/ui/input";

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
  { key: "chat_message", label: "Chat messages", description: "When you receive a direct message." },
  { key: "target_achieved", label: "Target achieved", description: "When you hit a sales or performance target." },
];

function PrefRow({ id, icon: Icon, label, description, checked, onCheckedChange, disabled }: PrefRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <Label htmlFor={id} className="text-[13px] font-medium text-foreground cursor-pointer">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

export function SettingsPreferences() {
  const [compactView, setCompactView] = useState(false);

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

      <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notification Channels</p>
        </div>
        <div className="px-4">
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
        </div>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Do Not Disturb</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">Quiet hours</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Push and SMS notifications are silenced during these hours.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label htmlFor="qh-start" className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                  <Input
                    id="qh-start"
                    type="time"
                    value={qhStart}
                    onChange={handleQhStartChange}
                    className="h-8 w-28 text-xs"
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
                    className="h-8 w-28 text-xs"
                    aria-label="Quiet hours end time"
                  />
                </div>
                <button
                  onClick={saveQuietHours}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
                {(qhStart || qhEnd) && (
                  <button
                    onClick={handleClearQuietHours}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notification Categories</p>
          <p className="text-xs text-muted-foreground">Toggle specific event types</p>
        </div>
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
      </div>
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
    <div className="px-4">
      <PrefRow
        id={`cat-${categoryKey}`}
        icon={BellOff}
        label={label}
        description={description}
        checked={checked}
        onCheckedChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
