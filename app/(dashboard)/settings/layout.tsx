import { SettingsNav } from "./settings-nav";

/** Settings shell (§8.7): global settings nav + content column capped at max-w-4xl. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col lg:flex-row">
      <SettingsNav />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
