"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { SettingsProfile } from "@/features/settings/settings-profile";
import { SettingsSecurity } from "@/features/settings/settings-security";
import { SettingsPreferences } from "@/features/settings/settings-preferences";
import { MfaSettings } from "@/components/settings/mfa-settings";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
] as const;

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PageWrapper
      title="Account Settings"
      subtitle="Manage your profile, preferences, and security."
      filters={
        <nav aria-label="Account settings sections" className="flex items-center gap-1">
          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="inline-flex h-8 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:focus-ring"
            >
              {label}
            </a>
          ))}
        </nav>
      }
    >
      <div className="max-w-3xl space-y-10">
        <section id="profile" className="scroll-mt-24">
          <SectionHeading title="Profile" description="Update your display name and profile photo." />
          <Card className="p-5">
            <SettingsProfile />
          </Card>
        </section>

        <section id="preferences" className="scroll-mt-24">
          <SectionHeading title="Preferences" description="Customise how the application looks and behaves." />
          <SettingsPreferences />
        </section>

        <section id="security" className="scroll-mt-24">
          <SectionHeading title="Security" description="Change your password and manage account security." />
          <div className="space-y-4">
            <SettingsSecurity />
            <MfaSettings />
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
