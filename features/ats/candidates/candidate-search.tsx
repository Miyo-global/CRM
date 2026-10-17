"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface CandidateRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string | null;
  jobs: string[];
  /** MIYO-0652: bulk actions work on applications, not candidates. */
  applicationIds?: number[];
}

/** MIYO-0652: a spreadsheet of what is on screen, quoted properly. */
function toCsv(rows: CandidateRow[]): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["Name", "Email", "Phone", "Source", "Jobs"].map(cell).join(",");
  const body = rows.map((row) =>
    [
      `${row.firstName} ${row.lastName}`.trim(),
      row.email,
      row.phone ?? "",
      row.source ?? "",
      row.jobs.join("; "),
    ]
      .map(cell)
      .join(","),
  );
  return [header, ...body].join("\n");
}

/** MIYO-0643: search as you type, with the server doing the matching. */
export function CandidateSearch({ initial }: { initial: CandidateRow[] }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function exportSelected() {
    const chosen = rows.filter((row) => selected.has(row.id));
    const csv = toCsv(chosen.length > 0 ? chosen : rows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "candidates.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded.");
  }

  useEffect(() => {
    const term = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/ats/candidates/search?q=${encodeURIComponent(term)}`,
        );
        if (res.ok) setRows(await res.json());
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="grid gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name, email, skills or anything in the resume"
        aria-label="Search candidates"
      />

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <Button variant="outline" size="sm" onClick={exportSelected}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title={loading ? "Searching…" : "No candidates match"}
          description="Try fewer words, or a part of the email address."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={() => toggle(row.id)}
                    aria-label={`Select ${row.firstName} ${row.lastName}`}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/ats/candidates/${row.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {row.firstName} {row.lastName}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[row.email, row.phone, row.jobs.join(", ")].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                {row.source && (
                  <span className="text-xs text-muted-foreground">{row.source}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
