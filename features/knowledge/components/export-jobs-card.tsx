"use client";

import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import {
  useKbCapabilities,
  useKbExportDownloadUrl,
  useKbExportJobs,
  useStartKbExport,
} from "@/lib/api/hooks/knowledge";
import { timeAgo } from "@/lib/date-utils";

/**
 * KB-0088: export the whole wiki.
 *
 * A whole-wiki export needs somewhere to put the zip, so it is hidden without
 * storage; a single page can still be exported from the page itself, which
 * streams straight back.
 */
export function ExportJobsCard() {
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const capabilities = useKbCapabilities();
  const jobs = useKbExportJobs();
  const startExport = useStartKbExport();
  const downloadUrl = useKbExportDownloadUrl();

  if (capabilities.data && !capabilities.data.storage) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Exporting the whole wiki needs file storage, which isn&apos;t set up. You can still
          export one page at a time from the page itself.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={format} onValueChange={(value) => setFormat(value as "markdown")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            disabled={startExport.isPending}
            onClick={() =>
              startExport.mutate(
                { format },
                {
                  onSuccess: () => toast.success("Export started"),
                  onError: () => toast.error("Couldn't start the export."),
                },
              )
            }
          >
            Export everything
          </Button>
        </div>

        <ul className="flex flex-col divide-y divide-border text-sm">
          {(jobs.data?.items ?? []).map((job) => (
            <li key={job.id} className="flex items-center gap-2 py-2">
              <StatusPill tone={job.status === "completed" ? "success" : "neutral"}>
                {job.status === "completed" ? "Ready" : job.status}
              </StatusPill>
              <span className="text-muted-foreground">{job.format}</span>
              <span className="ml-auto text-muted-foreground">
                {job.createdAt ? timeAgo(job.createdAt) : ""}
              </span>
              {job.status === "completed" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    downloadUrl.mutate(job.id, {
                      // A signed URL lives five minutes, so it is fetched at
                      // click time rather than rendered into the list.
                      onSuccess: (data) => window.open(data.url, "_blank", "noopener"),
                      onError: () =>
                        toast.error("That export has expired. Run a new one."),
                    })
                  }
                >
                  Download
                </Button>
              ) : null}
            </li>
          ))}
          {jobs.data && jobs.data.items.length === 0 ? (
            <li className="py-2 text-muted-foreground">No exports yet.</li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}
