"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const Briefcase = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2" /><path strokeLinecap="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
);
import { format } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";

interface Application {
  id: number;
  status: string | null;
  appliedAt?: string | Date | null;
  jobPosting?: { title?: string | null } | null;
}

interface ApplicationRowProps {
  app: Application;
}

const ApplicationRow = memo(function ApplicationRow({ app }: ApplicationRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{app.jobPosting?.title ?? "Unknown Job"}</p>
        <p className="text-xs text-muted-foreground">
          {app.appliedAt ? format(new Date(app.appliedAt), "PPP") : ""}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px]">
        {app.status ?? ""}
      </Badge>
    </div>
  );
});

interface ApplicationsTabProps {
  applications?: Application[] | null;
}

export const ApplicationsTab = memo(function ApplicationsTab({
  applications,
}: ApplicationsTabProps) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">Applications</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {!applications?.length ? (
          <EmptyState
            compact
            illustration={<Briefcase className="h-8 w-8 text-muted-foreground" />}
            title="No applications yet"
            description="This candidate hasn't applied to any jobs yet."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <ApplicationRow key={app.id} app={app} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
