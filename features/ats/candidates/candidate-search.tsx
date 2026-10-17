"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
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
}

/** MIYO-0643: search as you type, with the server doing the matching. */
export function CandidateSearch({ initial }: { initial: CandidateRow[] }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);

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
