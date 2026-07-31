"use client";

import { useState, useCallback } from "react";
import { FileSearch, Sparkles, Copy, CheckCheck, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useReportNarrator, type ReportNarratorResult } from "@/lib/api/hooks/ai";
import { toast } from "sonner";



const SAMPLE_DATA = `Month, New Leads, Converted, Revenue
Jan, 45, 12, 2.3L
Feb, 52, 18, 3.1L
Mar, 61, 22, 4.2L
Apr, 49, 15, 2.8L
May, 67, 25, 5.1L
Jun, 73, 30, 6.4L`;

const SAMPLE_CONTEXT = "Q2 Sales Performance — Lead Conversion Report";



function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [text]);

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} aria-label={`Copy ${label}`}>
      {copied ? (
        <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 mr-2" />
      )}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}



interface PreviousEntry {
  id: number;
  context: string;
  narrative: string;
  generatedAt: string;
}

interface PreviousNarrativeCardProps {
  entry: PreviousEntry;
}

function PreviousNarrativeCard({ entry }: PreviousNarrativeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = entry.narrative.slice(0, 180);
  const generatedAt = new Date(entry.generatedAt).toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{entry.context}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            {generatedAt}
          </div>
        </div>
        <CopyButton text={entry.narrative} label="narrative" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {expanded ? entry.narrative : `${preview}${entry.narrative.length > 180 ? "…" : ""}`}
      </p>
      {entry.narrative.length > 180 && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}



export default function ReportNarratorPage() {
  const { mutateAsync: generateNarrative, isPending } = useReportNarrator();

  const [context, setContext] = useState("");
  const [data, setData] = useState("");
  const [result, setResult] = useState<ReportNarratorResult | null>(null);
  const [history, setHistory] = useState<PreviousEntry[]>([]);
  const [nextId, setNextId] = useState(1);

  const handleGenerate = useCallback(async () => {
    if (!data.trim()) return;
    try {
      const res = await generateNarrative({
        data: data.trim(),
        context: context.trim() || undefined,
      });
      setResult(res);
      setHistory((prev) => {
        const entry: PreviousEntry = {
          id: nextId,
          context: context.trim() || "Business performance data",
          narrative: res.narrative,
          generatedAt: res.generatedAt,
        };
        return [entry, ...prev].slice(0, 3);
      });
      setNextId((n) => n + 1);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to generate narrative";
      if (msg.toLowerCase().includes("not configured")) {
        toast.error("AI features require OPENAI_API_KEY to be configured");
      } else {
        toast.error(msg);
      }
    }
  }, [data, context, generateNarrative, nextId]);

  const handleLoadExample = useCallback(() => {
    setData(SAMPLE_DATA);
    setContext(SAMPLE_CONTEXT);
  }, []);

  const generatedAt = result
    ? new Date(result.generatedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <PageWrapper
      title="Report Narrator"
      subtitle="Paste any data and get a plain-English narrative summary"
      badge={
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI
        </span>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" />
                Data Input
              </CardTitle>
              <CardDescription>
                Paste CSV, table data, numbers, or any text. The AI will generate a clear narrative.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-context">
                  Context{" "}
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="report-context"
                  placeholder="e.g. Q1 Sales Performance, Lead Conversion Report…"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  aria-label="Report context"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="report-data">
                    Data <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={handleLoadExample}
                    aria-label="Load example data"
                  >
                    Load example
                  </button>
                </div>
                <Textarea
                  id="report-data"
                  placeholder={"Month, New Leads, Converted, Revenue\nJan, 45, 12, 2.3L\n…"}
                  rows={10}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="font-mono text-xs resize-none"
                  aria-label="Paste your data here"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!data.trim() || isPending}
                aria-label="Generate narrative"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Narrative
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Previous Narratives</CardTitle>
                <CardDescription className="text-xs">Last {history.length} generated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.map((entry) => (
                  <PreviousNarrativeCard key={entry.id} entry={entry} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          {isPending && (
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isPending && result && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Generated Narrative</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Generated at {generatedAt}
                    </CardDescription>
                  </div>
                  <CopyButton text={result.narrative} label="narrative" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.narrative.split(/\n{2,}/).filter(Boolean).map((para, i) => (
                    <p key={i} className="text-sm text-foreground leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!isPending && !result && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border h-64 text-center p-8">
              <FileSearch className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No narrative yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Paste your data in the form and click &quot;Generate Narrative&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}


function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
