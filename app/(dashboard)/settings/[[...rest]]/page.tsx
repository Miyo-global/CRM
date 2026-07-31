"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { SettingsProfile } from "@/features/settings/settings-profile";
import { SettingsSecurity } from "@/features/settings/settings-security";
import { SettingsPreferences } from "@/features/settings/settings-preferences";
import { MfaSettings } from "@/components/settings/mfa-settings";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <PageWrapper
      title="Account Settings"
      subtitle="Manage your profile, preferences, and security."
    >
      <div className="max-w-2xl space-y-8">

        <section>
          <div className="mb-4">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update your display name and profile photo.
            </p>
          </div>
          <SettingsProfile />
        </section>

        <Separator />

        <section>
          <div className="mb-4">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Preferences</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customise how the application looks and behaves.
            </p>
          </div>
          <SettingsPreferences />
        </section>

        <Separator />

        <section>
          <div className="mb-4">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Security</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Change your password and manage account security.
            </p>
          </div>
          <div className="space-y-4">
            <SettingsSecurity />
            <MfaSettings />
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
