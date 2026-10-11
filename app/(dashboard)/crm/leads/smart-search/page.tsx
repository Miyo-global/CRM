"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Sparkles, ArrowRight, X } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { STATUS_CONFIG } from "@/features/crm/leads/leads-constants";
import type { Tone } from "@/lib/design/tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useNLSearch, type NLSearchLead } from "@/lib/api/hooks/ai";
import { formatINRCompact } from "@/lib/format-utils";

const EXAMPLE_QUERIES = [
  "Hot leads not yet contacted",
  "Qualified leads worth over 2L",
  "New leads from website this month",
  "Cold leads from Mumbai",
];

const PRIORITY_TONE: Record<string, Tone> = {
  HOT: "danger",
  WARM: "warning",
  COLD: "info",
};

function formatValue(val: number | null) {
  return val == null || Number(val) === 0 ? "" : formatINRCompact(val);
}

function capitalize(s: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function FilterBadges({ filters }: { filters: Record<string, unknown> }) {
  const entries = Object.entries(filters).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });

  if (!entries.length) return null;

  const label = (key: string) => {
    const map: Record<string, string> = {
      status: "Status",
      priority: "Priority",
      source: "Source",
      city: "City",
      minValue: "Min Value",
      maxValue: "Max Value",
      company: "Company",
      nameSearch: "Name",
      assignedToName: "Assigned To",
    };
    return map[key] ?? key;
  };

  const format = (key: string, val: unknown): string => {
    if (key === "minValue" || key === "maxValue") return formatValue(Number(val));
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground font-medium">Interpreted as:</span>
      {entries.map(([key, val]) => (
        <Badge key={key} variant="secondary" className="gap-1">
          <span className="text-muted-foreground">{label(key)}:</span>
          <span className="font-medium">{format(key, val)}</span>
        </Badge>
      ))}
    </div>
  );
}

function ResultsTable({ leads }: { leads: NLSearchLead[] }) {
  if (!leads.length) {
    return (
      <EmptyState
        illustration={<EmptySearchIllustration />}
        title="No leads match your search"
        description="Try adjusting your query or use different keywords."
      />
    );
  }

  return (
    <ScrollArea className="w-full" type="auto">
      <div className="min-w-[700px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>City</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link
                    href={`/crm/leads/${lead.id}`}
                    className="font-medium hover:text-brand-text transition-colors"
                  >
                    {lead.name}
                  </Link>
                  {lead.email && (
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.email}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.company ?? ""}
                </TableCell>
                <TableCell>
                  <StatusPill tone={STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]?.tone ?? "neutral"} dot>
                    {capitalize(lead.status)}
                  </StatusPill>
                </TableCell>
                <TableCell>
                  {lead.priority ? (
                    <StatusPill tone={PRIORITY_TONE[lead.priority] ?? "neutral"}>
                      {capitalize(lead.priority)}
                    </StatusPill>
                  ) : (
                    null
                  )}
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {formatValue(lead.value)}
                </TableCell>
                <TableCell className="text-muted-foreground capitalize">
                  {lead.source ? lead.source.replace(/_/g, " ") : ""}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.city ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default function SmartLeadSearchPage() {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, data, isPending, isError, error, reset } = useNLSearch();

  const handleSearch = useCallback(() => {
    const q = inputValue.trim();
    if (!q) return;
    mutate(q);
  }, [inputValue, mutate]);

  const handleChipClick = useCallback(
    (query: string) => {
      setInputValue(query);
      mutate(query);
    },
    [mutate],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    reset();
    inputRef.current?.focus();
  }, [reset]);

  const hasResult = !!data;

  return (
    <PageWrapper
      title="Smart Lead Search"
      subtitle='Search leads using natural language — "hot leads from Mumbai above 5L"'
      badge={
        <>
          <Sparkles className="size-3" aria-hidden="true" />
          AI-Powered
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Describe the leads you want"
                className="h-11 pl-9 pr-11"
                data-page-search
                aria-label="Natural language lead search"
              />
              {inputValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClear}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  aria-label="Clear search"
                >
                  <X />
                </Button>
              )}
            </div>
            <Button
              size="lg"
              onClick={handleSearch}
              disabled={!inputValue.trim()}
              loading={isPending}
            >
              {isPending ? (
                "Searching..."
              ) : (
                <>
                  <Sparkles />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleChipClick(q)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs outline-none transition-colors focus-visible:focus-ring",
                  "border-border text-muted-foreground hover:border-border-strong hover:bg-accent hover:text-foreground",
                  inputValue === q && "border-primary/50 bg-brand-soft text-brand-soft-foreground",
                )}
              >
                <ArrowRight className="size-3" aria-hidden="true" />
                {q}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <LoadingSkeleton />
        ) : isError ? (
          <QueryErrorState title="Search failed" error={error} onRetry={handleSearch} />
        ) : hasResult ? (
          <div className="space-y-4">
            <FilterBadges filters={data.parsedFilters} />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">{data.total}</span>{" "}
                {data.total === 1 ? "result" : "results"} found
              </p>
            </div>

            <ResultsTable leads={data.leads} />
          </div>
        ) : (
          
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface-sunken/40 px-6 py-16 text-center">
            <IconChip icon={Sparkles} size="lg" />
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold">Ask anything about your leads</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Use plain English to search leads by status, priority, city, value, source, and more.
              </p>
            </div>
            <div className="flex flex-col gap-2 items-start mt-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleChipClick(q)}
                  className="group flex items-center gap-2 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-brand-text focus-visible:focus-ring"
                >
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
