"use client";

import { format, parseISO } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { useExpiredAnnouncements } from "@/lib/api/hooks/dashboard";

/** Read-only list of announcements whose expiry has passed. */
function ExpiredAnnouncements() {
  const { data, isLoading, error, refetch } = useExpiredAnnouncements();
  if (isLoading) return <Skeleton className="h-24 w-full rounded-md" />;
  if (error) return <QueryErrorState error={error} onRetry={() => void refetch()} />;
  if (!data?.length) {
    return <EmptyState title="No expired announcements" description="Announcements show up here once their expiry date passes." compact />;
  }
  return (
    <Card>
      <CardContent className="p-4">
        <ul className="divide-y divide-border">
          {data.map((ann) => {
            const author =
              ann.authorFirstName && ann.authorLastName
                ? `${ann.authorFirstName} ${ann.authorLastName}`
                : ann.authorName ?? "Team";
            return (
              <li key={ann.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="wrap-anywhere text-sm leading-snug text-muted-foreground">{ann.content}</p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {author} · {format(parseISO(ann.createdAt), "MMM d, yyyy")}
                  {ann.expiresAt && ` · expired ${format(parseISO(ann.expiresAt), "MMM d, yyyy")}`}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Every active announcement (the dashboard widget shows only the latest few), plus an archive of expired ones. */
export default function AnnouncementsPage() {
  return (
    <PageWrapper title="Announcements">
      <Tabs defaultValue="active" className="max-w-3xl">
        <TabsList variant="underline">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <AnnouncementsWidget maxRows={Infinity} />
        </TabsContent>
        <TabsContent value="expired">
          <ExpiredAnnouncements />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
