import type { Metadata } from "next";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CalendarView } from "@/features/calendar/calendar-view";

export const metadata: Metadata = { title: "Calendar | Miyo Global CRM" };

export default function CalendarPage() {
  return (
    // h-full: without a definite height the month grid sized to its own
    // content and stopped short, leaving dead space below (QA-RESP-03).
    <PageWrapper title="Calendar" noInternalScroll className="h-full">
      <CalendarView />
    </PageWrapper>
  );
}
