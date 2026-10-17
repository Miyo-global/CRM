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
interface SavedView {
  name: string;
  query: string;
  source: string;
  pool: boolean;
}

/**
 * MIYO-0654: saved views live in this browser. They are one person's own
 * shortcuts, not shared state, so they do not need a table.
 * ponytail: localStorage per browser; move to a table if people ask to
 * share views or use them on a second machine.
 */
const VIEWS_KEY = "ats.candidate-views";

function readViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? "[]") as SavedView[];
  } catch {
    return [];
  }
}

export function CandidateSearch({ initial }: { initial: CandidateRow[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [pool, setPool] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
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
    setViews(readViews());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (source) params.set("source", source);
    if (pool) params.set("pool", "1");

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ats/candidates/search?${params.toString()}`);
        if (res.ok) setRows(await res.json());
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, source, pool]);

  function saveView() {
    const name = window.prompt("Call this view what?");
    if (!name?.trim()) return;
    const next = [
      ...views.filter((v) => v.name !== name.trim()),
      { name: name.trim(), query, source, pool },
    ];
    setViews(next);
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
      toast.success("View saved in this browser.");
    } catch {
      toast.error("This browser would not save the view.");
    }
  }

  function applyView(view: SavedView) {
    setQuery(view.query);
    setSource(view.source);
    setPool(view.pool);
  }

  return (
    <div className="grid gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name, email, skills or anything in the resume"
        aria-label="Search candidates"
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-foreground">
          <Checkbox checked={pool} onCheckedChange={(checked) => setPool(checked === true)} />
          Talent pool only
        </label>
        <Input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source"
          aria-label="Filter by source"
          className="h-9 w-40"
        />
        <Button variant="outline" size="sm" onClick={saveView}>
          Save this view
        </Button>
        {views.map((view) => (
          <Button
            key={view.name}
            variant="ghost"
            size="sm"
            onClick={() => applyView(view)}
          >
            {view.name}
          </Button>
        ))}
      </div>

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
