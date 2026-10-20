/**
 * Settings shell (§8.7): content column capped at max-w-4xl. The sidebar is
 * the settings nav; /settings itself lists the workspace settings (QA-DES-03).
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl">{children}</div>;
}
