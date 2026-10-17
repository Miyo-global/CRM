"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RECOMMENDATIONS: { value: string; label: string }[] = [
  { value: "STRONG_NO", label: "Strong no" },
  { value: "NO", label: "No" },
  { value: "MAYBE", label: "Maybe" },
  { value: "YES", label: "Yes" },
  { value: "STRONG_YES", label: "Strong yes" },
];

/** MIYO-0658: score the round, 1–5 on each criterion plus a recommendation. */
export function ScorecardForm({
  interviewId,
  criteria,
  initial,
}: {
  interviewId: number;
  criteria: string[];
  initial?: { ratings: Record<string, number>; recommendation: string; notes: string | null };
}) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>(initial?.ratings ?? {});
  const [recommendation, setRecommendation] = useState(initial?.recommendation ?? "MAYBE");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (Object.keys(ratings).length === 0) {
      toast.error("Score at least one criterion.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/interviews/${interviewId}/scorecard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings, recommendation, notes: notes || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Could not save the scorecard.");
        return;
      }
      toast.success("Scorecard submitted.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-xl gap-5">
      {criteria.map((criterion) => (
        <div key={criterion} className="grid gap-2">
          <Label>{criterion}</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <Button
                key={score}
                type="button"
                variant={ratings[criterion] === score ? "default" : "outline"}
                size="sm"
                onClick={() => setRatings((r) => ({ ...r, [criterion]: score }))}
              >
                {score}
              </Button>
            ))}
          </div>
        </div>
      ))}

      <div className="grid gap-2">
        <Label htmlFor="recommendation">Recommendation</Label>
        <Select value={recommendation} onValueChange={setRecommendation}>
          <SelectTrigger id="recommendation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECOMMENDATIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What they showed, what you would ask next."
        />
      </div>

      <div>
        <Button disabled={busy} onClick={() => void submit()}>
          {initial ? "Update scorecard" : "Submit scorecard"}
        </Button>
      </div>
    </div>
  );
}
