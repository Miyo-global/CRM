"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { AiScoreResult } from "@/lib/api/hooks/hr";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/design/tones";

const AI_SCORE_DIMENSIONS: Array<{ key: keyof AiScoreResult["breakdown"]; label: string }> = [
  { key: "technicalSkills", label: "Technical Skills" },
  { key: "experience", label: "Experience" },
  { key: "communication", label: "Communication" },
  { key: "cultureFit", label: "Culture Fit" },
  { key: "leadership", label: "Leadership" },
];

function scoreTone(score: number): Tone {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

interface ScoreDimensionRowProps {
  label: string;
  score: number;
}

const ScoreDimensionRow = memo(function ScoreDimensionRow({ label, score }: ScoreDimensionRowProps) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", toneText[scoreTone(score)])}>{score}</span>
      </div>
      <Progress value={score} tone={scoreTone(score)} className="h-1" />
    </div>
  );
});

interface AiScoreCardProps {
  displayAiScore: AiScoreResult | null;
  aiScoreGeneratedAt?: string | Date | null;
  isLatestScore: boolean;
  isPending: boolean;
  onGenerate: () => void;
}

export const AiScoreCard = memo(function AiScoreCard({
  displayAiScore,
  aiScoreGeneratedAt,
  isLatestScore,
  isPending,
  onGenerate,
}: AiScoreCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <IconChip icon={Sparkles} tone="brand" size="sm" />
          AI Score
        </CardTitle>
        <Button
          variant="outline"
          size="xs"
          onClick={onGenerate}
          loading={isPending}
        >
          {isPending ? "Scoring..." : displayAiScore ? "Re-score" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent>
        {displayAiScore ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Overall</span>
              <span className={cn("font-display text-3xl font-extrabold tabular-nums", toneText[scoreTone(displayAiScore.overall)])}>
                {displayAiScore.overall}
                <span className="text-sm font-medium text-muted-foreground">/100</span>
              </span>
            </div>
            <Progress value={displayAiScore.overall} tone={scoreTone(displayAiScore.overall)} />
            <div className="space-y-2 pt-1">
              {AI_SCORE_DIMENSIONS.map(({ key, label }) => (
                <ScoreDimensionRow
                  key={key}
                  label={label}
                  score={displayAiScore.breakdown[key] ?? 0}
                />
              ))}
            </div>
            {displayAiScore.summary && (
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                {displayAiScore.summary}
              </p>
            )}
            {aiScoreGeneratedAt && !isLatestScore && (
              <p className="text-xs tabular-nums text-muted-foreground">
                Scored {format(new Date(aiScoreGeneratedAt), "PPp")}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <IconChip icon={Sparkles} tone="neutral" />
            <p className="text-xs text-muted-foreground">
              Click &quot;Generate&quot; to score this candidate with AI.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
