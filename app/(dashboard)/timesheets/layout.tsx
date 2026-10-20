import type { Metadata } from "next";

// Both timesheet pages are client components, so the tab title lives here.
export const metadata: Metadata = { title: "Timesheets" };

export default function TimesheetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
