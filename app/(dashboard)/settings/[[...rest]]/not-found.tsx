import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";

/**
 * Settings 404.
 *
 * An unknown path such as /settings/teams used to leave the reader with a
 * fabricated "Settings › Teams" heading and nothing else (QA-0078). The page
 * now says the section does not exist and lists the ones that do.
 */
const SETTINGS_LINKS = [
  { href: "/settings", label: "Account settings" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/members", label: "Members" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/roles", label: "Roles and permissions" },
  { href: "/settings/audit-log", label: "Audit log" },
] as const;

export default function SettingsNotFound() {
  return (
    <PageWrapper title="Settings section not found">
      <Card className="max-w-xl space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          There is no settings section at this address. It may have been renamed
          or you may not have access to it.
        </p>
        <ul className="space-y-1.5">
          {SETTINGS_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </PageWrapper>
  );
}
