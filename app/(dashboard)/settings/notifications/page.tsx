"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, Mail, Smartphone, Monitor, Moon, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/api/hooks/hr/leaves-expenses";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "leaves", label: "Leave Requests", description: "Approvals, rejections, and new requests" },
  { key: "expenses", label: "Expense Claims", description: "Submitted, approved, or rejected expenses" },
  { key: "payroll", label: "Payroll", description: "Payslip ready and payment processed" },
  { key: "attendance", label: "Attendance", description: "Clock-in/out alerts and anomalies" },
  { key: "deals", label: "Deals", description: "Stage changes, wins, losses, and assignments" },
  { key: "leads", label: "Leads", description: "New leads assigned and follow-up reminders" },
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
  const [dirty, setDirty] = useState(false);

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
    }
  }, [prefs]);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleChannelToggle = useCallback((setter: (v: boolean) => void) => (val: boolean) => {
    setter(val);
    setDirty(true);
  }, []);

  const handleCategoryToggle = useCallback((key: string) => (val: boolean) => {
    setCategories(prev => ({ ...prev, [key]: val }));
    setDirty(true);
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
        onSuccess: () => { toast.success("Notification preferences saved"); setDirty(false); },
        onError: () => toast.error("Failed to save preferences"),
      }
    );
  }, [emailEnabled, pushEnabled, inAppEnabled, smsEnabled, quietStart, quietEnd, categories, updatePrefs]);

  if (isLoading) {
    return (
      <PageWrapper title="Notification Preferences" subtitle="Choose how and when you receive notifications">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Notification Preferences"
      subtitle="Choose how and when you receive notifications"
      actions={
        <Button onClick={handleSave} disabled={!dirty || updatePrefs.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updatePrefs.isPending ? "Saving..." : "Save Changes"}
        </Button>
      }
    >
      <motion.div className="space-y-6 max-w-2xl" variants={staggerContainer} initial="hidden" animate="visible">

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-gold" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Monitor, label: "In-App Notifications", desc: "Notification bell in the sidebar", value: inAppEnabled, setter: handleChannelToggle(setInAppEnabled) },
                { icon: Mail, label: "Email Notifications", desc: "Receive notifications to your email address", value: emailEnabled, setter: handleChannelToggle(setEmailEnabled) },
                { icon: Smartphone, label: "Push Notifications", desc: "Browser and mobile push notifications", value: pushEnabled, setter: handleChannelToggle(setPushEnabled) },
                { icon: Smartphone, label: "SMS Notifications", desc: "Text message alerts for urgent events", value: smsEnabled, setter: handleChannelToggle(setSmsEnabled) },
              ].map((ch, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ch.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{ch.label}</p>
                        <p className="text-xs text-muted-foreground">{ch.desc}</p>
                      </div>
                    </div>
                    <Switch checked={ch.value} onCheckedChange={ch.setter} aria-label={ch.label} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-4 w-4 text-purple-400" />
                Quiet Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Suppress non-urgent notifications during these hours. Urgent alerts (security, critical) will still be delivered.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-start">Start time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={quietStart}
                    onChange={e => { setQuietStart(e.target.value); markDirty(); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quiet-end">End time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={quietEnd}
                    onChange={e => { setQuietEnd(e.target.value); markDirty(); }}
                  />
                </div>
              </div>
              {quietStart && quietEnd && (
                <p className="text-xs text-muted-foreground mt-2">
                  Notifications suppressed from {quietStart} to {quietEnd}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue" />
                Notification Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIES.map((cat, i) => (
                <div key={cat.key}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                    <Switch
                      checked={categories[cat.key] ?? true}
                      onCheckedChange={handleCategoryToggle(cat.key)}
                      aria-label={cat.label}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
