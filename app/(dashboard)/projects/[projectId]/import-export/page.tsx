"use client";

import { use, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/lib/export/xlsx-utils";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { ticketKey } from "@/lib/projects/ticket-key";

interface ImportReport {
  dryRun: boolean;
  total: number;
  valid: number;
  created: number;
  rows: { line: number; ok: boolean; error?: string; title: string }[];
}

const TEMPLATE = "Title,Type,Priority,Points,Due Date,Assignee,Description";

/**
 * MIYO-0121: tickets out as CSV, tickets in from CSV. The import always
 * offers a dry run first, so a bad column is found before anything is
 * written.
 */
export default function ImportExportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId);
  const [csv, setCsv] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  const tickets = project?.tickets ?? [];

  const exportCsv = () => {
    downloadCsv(`${project?.key ?? "tickets"}-tickets.csv`, [
      {
        name: "Tickets",
        columns: [
          { header: "Key", key: "key" },
          { header: "Title", key: "title" },
          { header: "Type", key: "type" },
          { header: "Status", key: "status" },
          { header: "Priority", key: "priority" },
          { header: "Points", key: "points" },
          { header: "Due Date", key: "dueDate" },
          { header: "Assignee", key: "assignee" },
          { header: "Description", key: "description" },
        ],
        rows: tickets.map((t) => ({
          key: ticketKey(project?.key, t.ticketNumber),
          title: t.title,
          type: t.type ?? "",
          status: t.status ?? "",
          priority: t.priority ?? "",
          points: t.points ?? "",
          dueDate: t.dueDate ?? "",
          assignee: t.assignee?.email ?? "",
          description: t.description ?? "",
        })),
      },
    ]);
  };

  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      apiClient.post<ImportReport>(`/projects/${projectId}/tickets/import`, { csv, dryRun }),
    onSuccess: (result) => {
      setReport(result);
      if (!result.dryRun) {
        toast.success(`Imported ${result.created} ticket${result.created === 1 ? "" : "s"}.`);
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setCsv(await file.text());
    setReport(null);
  };

  return (
    <PageWrapper title="Import and export" subtitle="Tickets as CSV">
      <div className="space-y-8">
        <PageSection
          title="Export"
          description={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"} in this project.`}
        >
          <Button variant="outline" onClick={exportCsv} disabled={tickets.length === 0}>
            <Download className="size-4" aria-hidden="true" />
            Download CSV
          </Button>
        </PageSection>

        <PageSection
          title="Import"
          description="Columns are matched by name. Title is required; Type, Status, Priority, Points, Due Date (YYYY-MM-DD), Assignee (email) and Description are optional."
        >
          <div className="space-y-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              aria-label="CSV file"
              onChange={(e) => void readFile(e.target.files?.[0])}
            />
            <Textarea
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setReport(null);
              }}
              rows={8}
              className="font-mono text-xs"
              aria-label="CSV contents"
              placeholder={TEMPLATE}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => run.mutate(true)}
                disabled={!csv.trim() || run.isPending}
              >
                Dry run
              </Button>
              <Button
                onClick={() => run.mutate(false)}
                disabled={!csv.trim() || run.isPending || !report || report.valid === 0}
                title={!report ? "Run the dry run first" : undefined}
              >
                <Upload className="size-4" aria-hidden="true" />
                Import {report ? `${report.valid} row${report.valid === 1 ? "" : "s"}` : ""}
              </Button>
            </div>

            {report && (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                <p className="text-sm">
                  {report.dryRun ? "Dry run: " : "Imported: "}
                  <span className="tabular-nums">
                    {report.valid} of {report.total} rows are valid
                  </span>
                  {report.dryRun ? "." : `, ${report.created} created.`}
                </p>
                <ul className="space-y-1">
                  {report.rows
                    .filter((r) => !r.ok)
                    .map((r) => (
                      <li key={r.line} className="flex items-start gap-2 text-xs">
                        <StatusPill tone="danger">Line {r.line}</StatusPill>
                        <span className="text-muted-foreground">
                          {r.title ? `${r.title}: ` : ""}
                          {r.error}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </PageSection>
      </div>
    </PageWrapper>
  );
}
