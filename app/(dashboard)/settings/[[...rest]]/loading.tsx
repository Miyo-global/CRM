import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SettingsLoading() {
  return (
    <PageWrapper
      title="Account Settings"
      subtitle="Manage your profile, preferences, and security."
    >
      <div className="max-w-2xl space-y-8">
        <section>
          <div className="mb-4 space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </section>

        <Separator />

        <section>
          <div className="mb-4 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section>
          <div className="mb-4 space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
