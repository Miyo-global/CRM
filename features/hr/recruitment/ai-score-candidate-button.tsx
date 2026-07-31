"use client";

import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAIScoreCandidate } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AIScoreCandidateButtonProps {
  candidateId: number;
  jobId?: number;
  compact?: boolean;
}

export function AIScoreCandidateButton({ candidateId, jobId, compact }: AIScoreCandidateButtonProps) {
  const [open, setOpen] = useState(false);
  const scoreMutation = useAIScoreCandidate();
  const result = scoreMutation.data;

  const handleScore = () => {
    scoreMutation.mutate(
      { candidateId, jobId },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  const fitColor = (level: string) => {
    if (level === "excellent") return "text-emerald-500";
    if (level === "good") return "text-amber-500";
    if (level === "average") return "text-orange-500";
    return "text-red-500";
  };

  const fitBg = (level: string) => {
    if (level === "excellent") return "bg-emerald-500/10";
    if (level === "good") return "bg-amber-500/10";
    if (level === "average") return "bg-orange-500/10";
    return "bg-red-500/10";
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
            {result ? <span className={cn("font-bold", fitColor(result.fitLevel))}>{result.score}</span> : "Score"}
          </Button>
        </PopoverTrigger>
        {result && (
          <PopoverContent className="w-80 p-3" align="start" onClick={(e) => e.stopPropagation()}>
            <ScoreDetails result={result} fitColor={fitColor} fitBg={fitBg} />
          </PopoverContent>
        )}
      </Popover>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={handleScore} disabled={scoreMutation.isPending} className="w-full">
        {scoreMutation.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scoring...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2 text-gold" />AI Score Candidate</>
        )}
      </Button>
      {result && <ScoreDetails result={result} fitColor={fitColor} fitBg={fitBg} />}
    </div>
  );
}

interface ScoreResult {
  score: number;
  fitLevel: string;
  reasoning: string;
  strengths: string[];
  concerns: string[];
  suggestedQuestions: string[];
}

function ScoreDetails({
  result,
  fitColor,
  fitBg,
}: {
  result: ScoreResult;
  fitColor: (l: string) => string;
  fitBg: (l: string) => string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={cn("h-12 w-12 rounded-lg flex flex-col items-center justify-center font-bold", fitBg(result.fitLevel), fitColor(result.fitLevel))}>
          <span className="text-base leading-none">{result.score}</span>
          <span className="text-[8px] uppercase tracking-wider mt-0.5">fit</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium">Candidate Score</p>
            <Badge variant="secondary" className={cn("text-[9px] h-4 px-1 capitalize", fitColor(result.fitLevel))}>
              {result.fitLevel}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{result.reasoning}</p>
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

      {result.concerns.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Concerns</p>
          {result.concerns.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}

      {result.suggestedQuestions.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Suggested Questions</p>
          {result.suggestedQuestions.map((q, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <MessageSquare className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
              <span>{q}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
