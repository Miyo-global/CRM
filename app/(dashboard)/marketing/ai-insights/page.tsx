"use client";

import { useState, useCallback, memo } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Clock,
  ChevronRight,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaignInsights, type CampaignInsightsResult } from "@/lib/api/hooks/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";


const PERIODS = [
  { value: "last 7 days", label: "Last 7 Days" },
  { value: "last 30 days", label: "Last 30 Days" },
  { value: "last quarter", label: "Last Quarter" },
] as const;

type Period = (typeof PERIODS)[number]["value"];


function InsightsDisplay({ result }: { result: CampaignInsightsResult }) {
  const paragraphs = result.insights.split("\n").filter((line) => line.trim() !== "");

  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        const isSectionHeader = /^\d+\./.test(para.trim());
        return (
          <p
            key={i}
            className={cn(
              "text-sm leading-relaxed",
              isSectionHeader
                ? "font-semibold text-foreground mt-4 first:mt-0"
                : "text-muted-foreground"
            )}
          >
            {para}
          </p>
        );
      })}
    </div>
  );
}


interface PreviousInsightsItemProps {
  result: CampaignInsightsResult & { period: string };
  onRestore: (result: CampaignInsightsResult & { period: string }) => void;
}

const PreviousInsightsItem = memo(function PreviousInsightsItem({ result, onRestore }: PreviousInsightsItemProps) {
  const preview = result.insights.slice(0, 120).trim();
  const generatedAt = new Date(result.generatedAt);

  const handleRestore = useCallback(() => onRestore(result), [result, onRestore]);

  return (
    <button
      type="button"
      onClick={handleRestore}
      className="w-full text-left p-3 rounded-lg border border-border hover:border-gold/40 hover:bg-gold/5 transition-colors group"
      aria-label={`Restore insights from ${generatedAt.toLocaleDateString()}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {PERIODS.find((p) => p.value === result.period)?.label ?? result.period}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {generatedAt.toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{preview}…</p>
        </div>
        <ChevronRight
          className="h-4 w-4 text-muted-foreground group-hover:text-gold shrink-0 mt-0.5 transition-colors"
          aria-hidden="true"
        />
      </div>
    </button>
  );
});


type StoredInsight = CampaignInsightsResult & { period: string };

export default function AIInsightsPage() {
  const [period, setPeriod] = useState<Period>("last 30 days");
  const [current, setCurrent] = useState<StoredInsight | null>(null);
  const [history, setHistory] = useState<StoredInsight[]>([]);

  const { mutate, isPending } = useCampaignInsights();

  const handleGenerate = useCallback(() => {
    mutate(period, {
      onSuccess: (data) => {
        const stored: StoredInsight = { ...data, period };
        setCurrent(stored);
        setHistory((prev) => [stored, ...prev.filter((h) => h.generatedAt !== stored.generatedAt)].slice(0, 3));
        toast.success("Insights generated successfully");
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [period, mutate]);

  const handleRestore = useCallback((result: StoredInsight) => {
    setCurrent(result);
    setPeriod(result.period as Period);
  }, []);

  const handlePeriodChange = useCallback((v: string) => setPeriod(v as Period), []);

  const previousItems = history.filter((h) => h.generatedAt !== current?.generatedAt);

  return (
    <PageWrapper
      title="AI Campaign Insights"
      subtitle="Weekly AI-powered summary of your marketing performance"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-72 shrink-0 space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
                Generate Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-period" className="text-xs font-medium">
                  Analysis Period
                </Label>
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger id="ai-period" className="text-sm" aria-label="Select analysis period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-gold hover:bg-gold/90 text-white"
                onClick={handleGenerate}
                disabled={isPending}
                aria-label="Generate AI campaign insights"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Analysing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                    {current ? "Regenerate" : "Generate Insights"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {previousItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">Previous Reports</p>
              {previousItems.map((item) => (
                <PreviousInsightsItem
                  key={item.generatedAt}
                  result={item}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isPending ? (
            <Card className="shadow-soft h-full">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-5 w-1/4 mt-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ) : current ? (
            <Card className="shadow-soft h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
                    Marketing Performance Report
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {PERIODS.find((p) => p.value === current.period)?.label ?? current.period}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={handleGenerate}
                      disabled={isPending}
                      aria-label="Regenerate insights"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <InsightsDisplay result={current} />
              </CardContent>
              <CardFooter className="pt-3 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Generated at{" "}
                  {new Date(current.generatedAt).toLocaleString(DEFAULT_LOCALE, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardFooter>
            </Card>
          ) : (
            <Card className="shadow-soft h-full">
              <CardContent className="flex items-center justify-center min-h-[360px] p-8">
                <EmptyState
                  compact
                  icon={Sparkles}
                  title="No insights generated yet"
                  description="Select a time period and generate an AI-powered analysis of your marketing performance."
                  action={{ label: "Generate Now", onClick: handleGenerate }}
                  className="border-0 bg-transparent"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
