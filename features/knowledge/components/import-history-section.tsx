"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCancelKbImportJob,
  useKbImportJobs,
  useRetryKbImportJob,
} from "@/lib/api/hooks/knowledge";
import { timeAgo } from "@/lib/date-utils";

import {
  importJobFailedTitles,
  importJobIsRunning,
  importJobLabel,
  importJobSummary,
} from "../lib/import-job-label";
import { ImportFailedTitlesAlert } from "./import-failed-titles-alert";

/** KB-0088: past imports, with retry and cancel. */
export function ImportHistorySection() {
  const jobs = useKbImportJobs();
  const retryJob = useRetryKbImportJob();
  const cancelJob = useCancelKbImportJob();

  const rows = jobs.data?.items ?? [];
  const latestFailures = rows.length > 0 ? importJobFailedTitles(rows[0]) : [];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">Past imports</h2>

      <ImportFailedTitlesAlert titles={latestFailures} />

      <div className="w-full overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">State</TableHead>
              <TableHead className="min-w-[180px]">Result</TableHead>
              <TableHead className="w-24">Source</TableHead>
              <TableHead className="w-28 text-right">Started</TableHead>
              <TableHead className="w-32 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={5} message="Nothing imported yet." />
            ) : (
              rows.map((job) => {
                const badge = importJobLabel(job);
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {importJobSummary(job)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{job.sourceType}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {job.createdAt ? timeAgo(job.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {importJobIsRunning(job) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            cancelJob.mutate(job.id, {
                              onSuccess: () =>
                                toast.success("Cancelled. Pages already created are kept."),
                              onError: () => toast.error("Couldn't cancel it."),
                            })
                          }
                        >
                          Cancel
                        </Button>
                      ) : job.failedItems > 0 || job.status === "failed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            retryJob.mutate(job.id, {
                              onSuccess: () => toast.success("Retrying"),
                              onError: () => toast.error("Couldn't retry it."),
                            })
                          }
                        >
                          Retry
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
