"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, ShieldCheck, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAnalyzeChurnRisk } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AIChurnRiskButtonProps {
  clientId: number;
  openTickets?: number;
  ticketsLast90Days?: number;
  daysSinceLastActivity?: number | null;
  compact?: boolean;
}

export function AIChurnRiskButton({
  clientId,
  openTickets,
  ticketsLast90Days,
  daysSinceLastActivity,
  compact,
}: AIChurnRiskButtonProps) {
  const [open, setOpen] = useState(false);
  const analyzeMutation = useAnalyzeChurnRisk();
  const result = analyzeMutation.data;

  const handleAnalyze = () => {
    analyzeMutation.mutate(
      { clientId, openTickets, ticketsLast90Days, daysSinceLastActivity },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  const riskColor = (level: string) => {
    if (level === "critical") return "text-red-500";
    if (level === "high") return "text-orange-500";
    if (level === "medium") return "text-amber-500";
    return "text-emerald-500";
  };

  const riskBg = (level: string) => {
    if (level === "critical") return "bg-red-500/10";
    if (level === "high") return "bg-orange-500/10";
    if (level === "medium") return "bg-amber-500/10";
    return "bg-emerald-500/10";
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => handleAnalyze()}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-gold" />
            )}
            {result ? <span className={cn("font-bold capitalize", riskColor(result.riskLevel))}>{result.riskLevel}</span> : "Churn Risk"}
          </Button>
        </PopoverTrigger>
        {result && (
          <PopoverContent className="w-80 p-3" align="end">
            <ChurnDetails result={result} riskColor={riskColor} riskBg={riskBg} />
          </PopoverContent>
        )}
      </Popover>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleAnalyze}
        disabled={analyzeMutation.isPending}
        className="w-full"
      >
        {analyzeMutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2 text-gold" />AI Churn Risk Analysis</>
        )}
      </Button>
      {result && <ChurnDetails result={result} riskColor={riskColor} riskBg={riskBg} />}
    </div>
  );
}

interface ChurnResult {
  churnRiskScore: number;
  riskLevel: string;
  reasoning: string;
  riskFactors: string[];
  retentionActions: string[];
}

function ChurnDetails({
  result,
  riskColor,
  riskBg,
}: {
  result: ChurnResult;
  riskColor: (l: string) => string;
  riskBg: (l: string) => string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={cn("h-12 w-12 rounded-lg flex flex-col items-center justify-center font-bold", riskBg(result.riskLevel), riskColor(result.riskLevel))}>
          <span className="text-base leading-none">{result.churnRiskScore}</span>
          <span className="text-[8px] uppercase tracking-wider mt-0.5">risk</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium">Churn Risk</p>
            <Badge variant="secondary" className={cn("text-[9px] h-4 px-1 capitalize", riskColor(result.riskLevel))}>
              {result.riskLevel}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{result.reasoning}</p>
        </div>
      </div>

      {result.riskFactors.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Risk Factors</p>
          {result.riskFactors.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      {result.retentionActions.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Retention Actions</p>
          {result.retentionActions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <ShieldCheck className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
