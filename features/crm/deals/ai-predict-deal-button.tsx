"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePredictDeal } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AIPredictDealButtonProps {
  dealId: number;
  compact?: boolean;
}

export function AIPredictDealButton({ dealId, compact }: AIPredictDealButtonProps) {
  const [open, setOpen] = useState(false);
  const predictMutation = usePredictDeal();
  const result = predictMutation.data;

  useEffect(() => {
    predictMutation.reset();
  }, [dealId]);

  const handlePredict = () => {
    predictMutation.mutate(dealId, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const probColor = (prob: number) => {
    if (prob >= 75) return "text-emerald-500";
    if (prob >= 50) return "text-amber-500";
    if (prob >= 25) return "text-orange-500";
    return "text-red-500";
  };

  const probBg = (prob: number) => {
    if (prob >= 75) return "bg-emerald-500/10";
    if (prob >= 50) return "bg-amber-500/10";
    if (prob >= 25) return "bg-orange-500/10";
    return "bg-red-500/10";
  };

  const confidenceVariant = (c: string): "default" | "secondary" | "outline" => {
    if (c === "high") return "default";
    if (c === "medium") return "secondary";
    return "outline";
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => { if (!result) handlePredict(); }}
            disabled={predictMutation.isPending}
          >
            {predictMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-gold" />
            )}
            {result ? <span className={cn("font-bold", probColor(result.winProbability))}>{result.winProbability}%</span> : "Predict"}
          </Button>
        </PopoverTrigger>
        {result && (
          <PopoverContent className="w-80 p-3" align="end">
            <PredictDetails result={result} probColor={probColor} probBg={probBg} confidenceVariant={confidenceVariant} />
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
        onClick={handlePredict}
        disabled={predictMutation.isPending}
        className="w-full"
      >
        {predictMutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Predicting...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2 text-gold" />AI Predict Win Probability</>
        )}
      </Button>
      {result && <PredictDetails result={result} probColor={probColor} probBg={probBg} confidenceVariant={confidenceVariant} />}
    </div>
  );
}

interface PredictResult {
  winProbability: number;
  confidence: string;
  reasoning: string;
  riskFactors: string[];
  positiveSignals: string[];
  recommendedActions: string[];
}

function PredictDetails({
  result,
  probColor,
  probBg,
  confidenceVariant,
}: {
  result: PredictResult;
  probColor: (n: number) => string;
  probBg: (n: number) => string;
  confidenceVariant: (c: string) => "default" | "secondary" | "outline";
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={cn("h-12 w-12 rounded-lg flex flex-col items-center justify-center font-bold", probBg(result.winProbability), probColor(result.winProbability))}>
          <span className="text-base leading-none">{result.winProbability}%</span>
          <span className="text-[8px] uppercase tracking-wider mt-0.5">win</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium">AI Prediction</p>
            <Badge variant={confidenceVariant(result.confidence)} className="text-[9px] h-4 px-1">{result.confidence}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{result.reasoning}</p>
        </div>
      </div>

      {result.positiveSignals.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Positive Signals</p>
          {result.positiveSignals.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <TrendingUp className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {result.riskFactors.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Risk Factors</p>
          {result.riskFactors.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {result.recommendedActions.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Recommended Actions</p>
          {result.recommendedActions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <Lightbulb className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
