"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FunnelRow {
  stage: string;
  candidates: number;
}

/** MIYO-0676: the job and date filters, plus the CSV of what is shown. */
export function FunnelFilters({
  jobs,
  rows,
}: {
  jobs: { id: number; title: string }[];
  rows: FunnelRow[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/ats/reports/funnel?${next.toString()}`);
  }

  function exportCsv() {
    const csv = ["Stage,Candidates", ...rows.map((r) => `"${r.stage}",${r.candidates}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "funnel.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="grid gap-2">
        <Label htmlFor="job">Job</Label>
        <Select
          value={params.get("jobId") ?? "all"}
          onValueChange={(value) => setParam("jobId", value === "all" ? "" : value)}
        >
          <SelectTrigger id="job" className="w-56">
            <SelectValue placeholder="Every job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every job</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={String(job.id)}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="from">Applied from</Label>
        <Input
          id="from"
          type="date"
          defaultValue={params.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          type="date"
          defaultValue={params.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </div>

      <Button variant="outline" onClick={exportCsv}>
        Export CSV
      </Button>
    </div>
  );
}
