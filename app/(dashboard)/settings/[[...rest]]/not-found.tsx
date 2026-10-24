import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { SettingsIndexLinks } from "../settings-index-links";

/**
 * Settings 404.
 *
 * An unknown path such as /settings/teams used to leave the reader with a
 * fabricated "Settings › Teams" heading and nothing else (QA-0078). The page
 * says the section does not exist and links to the sections the caller's own
 * role can open: a hard-coded list showed admin-only sections to an Employee
 * (R3-SA-14).
 */
export default function SettingsNotFound() {
  return (
    <PageWrapper title="Settings section not found">
      <div className="max-w-3xl space-y-4">
        <Card className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">
            There is no settings section at this address. It may have been renamed
            or you may not have access to it.
          </p>
          <Link href="/settings" className="text-sm text-primary underline-offset-4 hover:underline">
            Account settings
          </Link>
        </Card>
        <SettingsIndexLinks />
      </div>
    </PageWrapper>
  );
}
