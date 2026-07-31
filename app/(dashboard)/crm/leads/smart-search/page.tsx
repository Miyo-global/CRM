"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Sparkles, ArrowRight, X } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
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

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CONTACTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  INTERESTED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  QUALIFIED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CONVERTED: "bg-green-500/10 text-green-400 border-green-500/20",
  LOST: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const PRIORITY_STYLES: Record<string, string> = {
  HOT: "bg-red-500/10 text-red-400 border-red-500/20",
  WARM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COLD: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
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
        <Badge key={key} variant="outline" className="text-xs gap-1">
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
        illustration={<EmptySearchIllustration className="h-40 w-40" />}
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
              <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link
                    href={`/crm/leads/${lead.id}`}
                    className="font-medium hover:text-primary transition-colors"
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
                  <Badge
                    variant="outline"
                    className={cn("text-xs", STATUS_STYLES[lead.status] ?? "")}
                  >
                    {capitalize(lead.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.priority ? (
                    <Badge
                      variant="outline"
                      className={cn("text-xs", PRIORITY_STYLES[lead.priority] ?? "")}
                    >
                      {capitalize(lead.priority)}
                    </Badge>
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
  const { mutate, data, isPending, reset } = useNLSearch();

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
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Sparkles className="h-3 w-3 text-primary" />
          AI-Powered
        </Badge>
      }
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder='Try: "hot leads from Mumbai with value above 5 lakhs"'
                className="pl-9 pr-9 h-11 text-sm"
                aria-label="Natural language lead search"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={!inputValue.trim() || isPending}
              className="h-11 px-5 gap-2"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Searching...
                </span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
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
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                  "border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                  inputValue === q && "border-primary text-primary bg-primary/5",
                )}
              >
                <ArrowRight className="h-3 w-3" />
                {q}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <LoadingSkeleton />
        ) : hasResult ? (
          <div className="space-y-4">
            <FilterBadges filters={data.parsedFilters} />

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{data.total}</span>{" "}
                {data.total === 1 ? "result" : "results"} found
              </p>
            </div>

            <ResultsTable leads={data.leads} />
          </div>
        ) : (
          
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="rounded-full bg-primary/10 p-5">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Ask anything about your leads</h3>
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
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
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
