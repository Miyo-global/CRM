"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, ChevronRight, Rows3 } from "lucide-react";
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
}

function PrefRow({ id, icon: Icon, label, description, checked, onCheckedChange }: PrefRowProps) {
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

  const handleCompactToggle = useCallback((checked: boolean) => {
    setCompactView(checked);
    document.documentElement.classList.toggle("compact", checked);
    toast.success(checked ? "Compact view enabled" : "Compact view disabled");
  }, []);

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

      {/* Notification preferences live on one page, with the categories
          the mailer honours (R2-SYS-02). */}
      <SettingsSection title="Notifications">
        <SettingRow
          title="Notification preferences"
          description="Channels, quiet hours and which updates you receive."
          icon={
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="size-4" aria-hidden />
            </span>
          }
          control={
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/notifications">
                Manage
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          }
        />
      </SettingsSection>
    </div>
  );
}
