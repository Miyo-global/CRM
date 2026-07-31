"use client";

import { useState, useCallback } from "react";
import {
  Brain,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  XCircle,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSentimentAnalysis, type SentimentResult } from "@/lib/api/hooks/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";



const sentimentConfig = {
  positive: {
    label: "Positive",
    icon: CheckCircle2,
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    score: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-400",
  },
  neutral: {
    label: "Neutral",
    icon: MinusCircle,
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    score: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-400",
  },
  negative: {
    label: "Negative",
    icon: AlertTriangle,
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    score: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-400",
  },
  critical: {
    label: "Critical",
    icon: XCircle,
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    score: "text-red-600 dark:text-red-400",
    ring: "ring-red-400",
  },
} as const;

const churnRiskConfig = {
  low: {
    label: "Low Risk",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  medium: {
    label: "Medium Risk",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  high: {
    label: "High Risk",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
} as const;



function ScoreCircle({ score, sentiment }: { score: number; sentiment: SentimentResult["sentiment"] }) {
  const cfg = sentimentConfig[sentiment];
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center" aria-label={`Score: ${score} out of 100`}>
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className={cfg.score}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-bold tabular-nums", cfg.score)}>{score}</span>
        <span className="text-[10px] text-muted-foreground leading-none">/ 100</span>
      </div>
    </div>
  );
}



function ResultCard({ result }: { result: SentimentResult }) {
  const sentCfg = sentimentConfig[result.sentiment];
  const churnCfg = churnRiskConfig[result.churnRisk];
  const SentIcon = sentCfg.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-6 flex-wrap">
        <ScoreCircle score={result.score} sentiment={result.sentiment} />
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                sentCfg.badge,
              )}
            >
              <SentIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {sentCfg.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                churnCfg.badge,
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Churn: {churnCfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-snug max-w-sm">{result.summary}</p>
        </div>
      </div>

      {result.riskFactors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Risk Factors
          </h3>
          <ul className="space-y-1.5">
            {result.riskFactors.map((rf, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground">
                <span
                  className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                {rf}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-gold" aria-hidden="true" />
            Recommendations
          </h3>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground">
                <span
                  className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center font-medium"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}



interface HistoryEntry {
  id: number;
  clientName: string;
  result: SentimentResult;
}

function HistoryItem({
  entry,
  onSelect,
  isActive,
}: {
  entry: HistoryEntry;
  onSelect: (entry: HistoryEntry) => void;
  isActive: boolean;
}) {
  const sentCfg = sentimentConfig[entry.result.sentiment];
  const SentIcon = sentCfg.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg border transition-colors text-sm",
        isActive
          ? "border-gold bg-gold/5"
          : "border-border hover:border-border/80 hover:bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground truncate">{entry.clientName || "Unknown Client"}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full text-[11px] font-medium",
            sentCfg.badge,
          )}
        >
          <SentIcon className="h-3 w-3" aria-hidden="true" />
          {sentCfg.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">Score: {entry.result.score}/100</p>
    </button>
  );
}



export default function SentimentAnalysisPage() {
  const [clientName, setClientName] = useState("");
  const [text, setText] = useState("");
  const [activeResult, setActiveResult] = useState<SentimentResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [nextId, setNextId] = useState(1);

  const { mutate, isPending } = useSentimentAnalysis();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!text.trim()) return;

      mutate(
        { text: text.trim(), clientName: clientName.trim() || undefined },
        {
          onSuccess: (data) => {
            setActiveResult(data);
            const entry: HistoryEntry = {
              id: nextId,
              clientName: clientName.trim() || `Analysis ${nextId}`,
              result: data,
            };
            setHistory((prev) => [entry, ...prev].slice(0, 5));
            setNextId((n) => n + 1);
            toast.success("Sentiment analysis complete");
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Failed to analyse sentiment");
          },
        },
      );
    },
    [text, clientName, mutate, nextId],
  );

  const handleSelectHistory = useCallback((entry: HistoryEntry) => {
    setActiveResult(entry.result);
  }, []);

  return (
    <PageWrapper
      title="Client Sentiment Analysis"
      subtitle="Paste recent client communications to detect sentiment and churn risk"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Paste emails, support tickets, meeting notes, or chat messages from a client. Our AI will
          analyze the sentiment, calculate a client health score, identify churn risk, and provide
          actionable recommendations for your customer success team.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-noir">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-gold" aria-hidden="true" />
                  Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="clientName" className="text-xs font-medium">
                      Client Name
                      <span className="text-muted-foreground ml-1">(optional)</span>
                    </Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma / Tata Consultancy"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="commText" className="text-xs font-medium">
                      Recent Client Communications{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="commText"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Paste emails, support tickets, meeting notes, or chat messages from the client..."
                      required
                      rows={8}
                      className="resize-none text-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending || !text.trim()}
                    className="w-full bg-gold hover:bg-gold/90 text-white"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" aria-hidden="true" />
                        Analyze Sentiment
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {history.length > 0 && (
              <Card className="shadow-noir">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Recent Analyses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {history.map((entry) => (
                    <HistoryItem
                      key={entry.id}
                      entry={entry}
                      onSelect={handleSelectHistory}
                      isActive={activeResult === entry.result}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card className={cn("shadow-noir h-full", isPending && "opacity-70")}>
              <CardContent className="p-5">
                {isPending ? (
                  <div className="flex flex-col items-center justify-center min-h-[360px] gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">Analyzing client communications…</p>
                  </div>
                ) : activeResult ? (
                  <ResultCard result={activeResult} />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[360px] gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                      <Brain className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No analysis yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                        Paste client communications and click &quot;Analyze Sentiment&quot; to get started.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {(["positive", "neutral", "negative", "critical"] as const).map((s) => {
                        const cfg = sentimentConfig[s];
                        const Icon = cfg.icon;
                        return (
                          <Badge
                            key={s}
                            variant="outline"
                            className={cn("gap-1 text-xs", cfg.badge)}
                          >
                            <Icon className="h-3 w-3" aria-hidden="true" />
                            {cfg.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
