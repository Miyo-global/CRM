"use client";

import { memo } from "react";
import { Briefcase } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyJobPostingsIllustration } from "@/components/illustrations";
import type { Tone } from "@/lib/design/tones";

interface Application {
  id: number;
  status: string | null;
  appliedAt?: string | Date | null;
  jobPosting?: { title?: string | null } | null;
}

const STATUS_TONE: Record<string, Tone> = {
  APPLIED: "info",
  SHORTLISTED: "teal",
  INTERVIEWING: "plum",
  OFFERED: "brand",
  ACCEPTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
};

interface ApplicationRowProps {
  app: Application;
}

const ApplicationRow = memo(function ApplicationRow({ app }: ApplicationRowProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 py-2.5">
      <IconChip icon={Briefcase} tone="neutral" size="sm" className="size-8" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{app.jobPosting?.title ?? "Unknown Job"}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {app.appliedAt ? format(new Date(app.appliedAt), "PPP") : ""}
        </p>
      </div>
      {app.status && (
        <StatusPill tone={STATUS_TONE[app.status.toUpperCase()] ?? "neutral"} dot>
          {app.status}
        </StatusPill>
      )}
    </li>
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
      <CardHeader>
        <CardTitle className="text-base">Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {!applications?.length ? (
          <EmptyState
            compact
            illustration={<EmptyJobPostingsIllustration className="size-24" />}
            title="No applications yet"
            description="This candidate hasn't applied to any jobs yet."
            className="border-0 bg-transparent"
          />
        ) : (
          <ul className="divide-y divide-border">
            {applications.map((app) => (
              <ApplicationRow key={app.id} app={app} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
