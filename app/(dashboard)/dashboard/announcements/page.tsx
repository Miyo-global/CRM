import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";

/** Every active announcement; the dashboard widget shows only the latest few. */
export default function AnnouncementsPage() {
  return (
    <PageWrapper title="Announcements">
      <div className="max-w-3xl">
        <AnnouncementsWidget maxRows={Infinity} />
      </div>
    </PageWrapper>
  );
}
