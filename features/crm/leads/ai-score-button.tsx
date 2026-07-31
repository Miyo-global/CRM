"use client";

import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAIScoreLead } from "@/lib/api/hooks/ai";
import { toast } from "sonner";

interface AIScoreButtonProps {
  leadId: number;
  currentScore?: number | null;
  compact?: boolean;
}

export function AIScoreButton({ leadId, currentScore, compact }: AIScoreButtonProps) {
  const [open, setOpen] = useState(false);
  const scoreMutation = useAIScoreLead();
  const result = scoreMutation.data;

  const handleScore = () => {
    scoreMutation.mutate(leadId, {
      onError: (err) => toast.error(err.message || "AI scoring failed"),
    });
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              if (!result) handleScore();
            }}
            disabled={scoreMutation.isPending}
          >
            {scoreMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-gold" />
            )}
            {result ? (
              <span className={cn("font-bold", scoreColor(result.score))}>{result.score}</span>
            ) : currentScore ? (
              <span className="text-muted-foreground">{currentScore}</span>
            ) : (
              "Score"
            )}
          </Button>
        </PopoverTrigger>
        {result && (
          <PopoverContent className="w-72 p-3" align="start" onClick={(e) => e.stopPropagation()}>
            <AIScoreDetails result={result} />
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
        onClick={handleScore}
        disabled={scoreMutation.isPending}
        className="w-full"
      >
        {scoreMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Scoring with AI...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2 text-gold" />
            AI Score Lead
          </>
        )}
      </Button>

      {result && <AIScoreDetails result={result} />}
    </div>
  );
}

function AIScoreDetails({ result }: { result: { score: number; reasoning: string; strengths: string[]; weaknesses: string[]; suggestedActions: string[] } }) {
  const scoreColor = result.score >= 80 ? "text-emerald-500" : result.score >= 60 ? "text-amber-500" : result.score >= 40 ? "text-orange-500" : "text-red-500";
  const scoreBg = result.score >= 80 ? "bg-emerald-500/10" : result.score >= 60 ? "bg-amber-500/10" : result.score >= 40 ? "bg-orange-500/10" : "bg-red-500/10";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg", scoreBg, scoreColor)}>
          {result.score}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">AI Score</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{result.reasoning}</p>
        </div>
      </div>

      {result.strengths.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Strengths</p>
          {result.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <TrendingUp className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {result.weaknesses.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Weaknesses</p>
          {result.weaknesses.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <TrendingDown className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {result.suggestedActions.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Suggested Actions</p>
          {result.suggestedActions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <AlertCircle className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
