"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Mail, Smartphone, Monitor, Moon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/api/hooks/hr/leaves-expenses";
import { toast } from "sonner";
import { SettingsSection, SettingRow } from "@/features/settings/settings-row";

/** The keys match EmailCategory in lib/email/preference-rules.ts. */
const CATEGORIES = [
  { key: "leaves", label: "Leave Requests", description: "Approvals, rejections, and new requests" },
  { key: "expenses", label: "Expense Claims", description: "Submitted, approved, or rejected expenses" },
  { key: "payroll", label: "Payroll", description: "Payslip ready and payment processed" },
  { key: "attendance", label: "Attendance", description: "Clock-in/out alerts and anomalies" },
  { key: "tasks", label: "Tasks & Projects", description: "Task assignments, deadlines, and updates" },
  { key: "hr", label: "HR Updates", description: "Resignations, terminations, and onboarding" },
  { key: "system", label: "System", description: "Security alerts and account changes" },
];

export default function NotificationPreferencesPage() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [categories, setCategories] = useState<Record<string, boolean>>({});
  // Dirty = differs from what is saved, so toggling back clears it
  // (P3-notifications-settings-no-dirty-state).
  const current = JSON.stringify({ emailEnabled, pushEnabled, inAppEnabled, smsEnabled, quietStart, quietEnd, categories });
  const [saved, setSaved] = useState(current);
  const dirty = current !== saved;

  useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.emailEnabled ?? true);
      setPushEnabled(prefs.pushEnabled ?? true);
      setInAppEnabled(prefs.inAppEnabled ?? true);
      setSmsEnabled(prefs.smsEnabled ?? false);
      setQuietStart(prefs.quietHoursStart ?? "");
      setQuietEnd(prefs.quietHoursEnd ?? "");
      const cats: Record<string, boolean> = {};
      CATEGORIES.forEach(c => {
        cats[c.key] = prefs.categories?.[c.key] ?? true;
      });
      setCategories(cats);
      setSaved(JSON.stringify({
        emailEnabled: prefs.emailEnabled ?? true,
        pushEnabled: prefs.pushEnabled ?? true,
        inAppEnabled: prefs.inAppEnabled ?? true,
        smsEnabled: prefs.smsEnabled ?? false,
        quietStart: prefs.quietHoursStart ?? "",
        quietEnd: prefs.quietHoursEnd ?? "",
        categories: cats,
      }));
    }
  }, [prefs]);

  const handleChannelToggle = useCallback((setter: (v: boolean) => void) => (val: boolean) => {
    setter(val);
  }, []);

  const handleCategoryToggle = useCallback((key: string) => (val: boolean) => {
    setCategories(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = useCallback(() => {
    updatePrefs.mutate(
      {
        emailEnabled,
        pushEnabled,
        inAppEnabled,
        smsEnabled,
        quietHoursStart: quietStart || undefined,
        quietHoursEnd: quietEnd || undefined,
        categories,
      },
      {
        onSuccess: () => { toast.success("Notification preferences saved"); setSaved(current); },
        onError: () => toast.error("Failed to save preferences"),
      }
    );
  }, [emailEnabled, pushEnabled, inAppEnabled, smsEnabled, quietStart, quietEnd, categories, current, updatePrefs]);

  if (isLoading) {
    return (
      <PageWrapper title="Notification preferences">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </PageWrapper>
    );
  }

  const iconChip = (Icon: React.ElementType) => (
    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icon className="size-4" aria-hidden />
    </span>
  );

  return (
    <PageWrapper
      title="Notification preferences"
      actions={
        <>
          {dirty && <span className="text-xs text-warning-strong">Unsaved changes</span>}
          <Button onClick={handleSave} disabled={!dirty || updatePrefs.isPending} loading={updatePrefs.isPending}>
            {!updatePrefs.isPending && <Save aria-hidden />}
            {updatePrefs.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">

        <div>
          <SettingsSection
            title={
              <span className="flex items-center gap-2">
                <Bell className="size-4 text-brand-text" aria-hidden />
                Notification Channels
              </span>
            }
          >
            {[
              { id: "channel-in-app", icon: Monitor, label: "In-App Notifications", desc: "Notification bell in the sidebar", value: inAppEnabled, setter: handleChannelToggle(setInAppEnabled) },
              { id: "channel-email", icon: Mail, label: "Email Notifications", desc: "Receive notifications to your email address", value: emailEnabled, setter: handleChannelToggle(setEmailEnabled) },
              { id: "channel-push", icon: Smartphone, label: "Push Notifications", desc: "Browser and mobile push notifications", value: pushEnabled, setter: handleChannelToggle(setPushEnabled) },
              { id: "channel-sms", icon: Smartphone, label: "SMS Notifications", desc: "Text message alerts for urgent events", value: smsEnabled, setter: handleChannelToggle(setSmsEnabled) },
            ].map((ch) => (
              <SettingRow
                key={ch.id}
                htmlFor={ch.id}
                icon={iconChip(ch.icon)}
                title={ch.label}
                description={ch.desc}
                control={<Switch id={ch.id} checked={ch.value} onCheckedChange={ch.setter} aria-label={ch.label} />}
              />
            ))}
          </SettingsSection>
        </div>

        <div>
          <SettingsSection
            title={
              <span className="flex items-center gap-2">
                <Moon className="size-4 text-plum-strong" aria-hidden />
                Quiet Hours
              </span>
            }
            description="Suppress non-urgent notifications during these hours. Urgent alerts (security, critical) will still be delivered."
          >
            <div className="px-5 py-4">
              <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-start">Start time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={quietStart}
                    className="tabular-nums"
                    onChange={e => { setQuietStart(e.target.value); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-end">End time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={quietEnd}
                    className="tabular-nums"
                    onChange={e => { setQuietEnd(e.target.value); }}
                  />
                </div>
              </div>
              {quietStart && quietEnd && (
                <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                  Notifications suppressed from {quietStart} to {quietEnd}
                </p>
              )}
            </div>
          </SettingsSection>
        </div>

        <div>
          <SettingsSection
            title={
              <span className="flex items-center gap-2">
                <Bell className="size-4 text-muted-foreground" aria-hidden />
                Notification Categories
              </span>
            }
          >
            {CATEGORIES.map((cat) => (
              <SettingRow
                key={cat.key}
                htmlFor={`category-${cat.key}`}
                title={cat.label}
                description={cat.description}
                control={
                  <Switch
                    id={`category-${cat.key}`}
                    checked={categories[cat.key] ?? true}
                    onCheckedChange={handleCategoryToggle(cat.key)}
                    aria-label={cat.label}
                  />
                }
              />
            ))}
          </SettingsSection>
        </div>
      </div>
    </PageWrapper>
  );
}
