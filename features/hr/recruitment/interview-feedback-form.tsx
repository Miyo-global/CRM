"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateInterview } from "@/lib/api/hooks/hr";
import { Star, Plus, X } from "lucide-react";
import type { Interview, InterviewResult, InterviewRubricEntry } from "@/types/hr";

const DEFAULT_RUBRIC_CATEGORIES = [
  "Technical Skills",
  "Communication",
  "Problem Solving",
  "Culture Fit",
  "Experience",
];

interface InterviewFeedbackFormProps {
  interview: Interview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewFeedbackForm({ interview, open, onOpenChange }: InterviewFeedbackFormProps) {
  const updateInterview = useUpdateInterview();
  const [result, setResult] = useState<InterviewResult>(interview.result ?? "PENDING");
  const [feedback, setFeedback] = useState(interview.feedback ?? "");
  const [overallRating, setOverallRating] = useState(interview.rating ?? 0);
  const initialRubric =
    interview.rubric ?? DEFAULT_RUBRIC_CATEGORIES.map((cat) => ({ category: cat, score: 0, maxScore: 10, comment: "" }));
  const [rubric, setRubric] = useState<InterviewRubricEntry[]>(initialRubric);
  const keyCounter = useRef(0);
  const [rubricKeys, setRubricKeys] = useState<number[]>(() => initialRubric.map(() => keyCounter.current++));

  useEffect(() => {
    const nextRubric =
      interview.rubric ?? DEFAULT_RUBRIC_CATEGORIES.map((cat) => ({ category: cat, score: 0, maxScore: 10, comment: "" }));
    setResult(interview.result ?? "PENDING");
    setFeedback(interview.feedback ?? "");
    setOverallRating(interview.rating ?? 0);
    setRubric(nextRubric);
    setRubricKeys(nextRubric.map(() => keyCounter.current++));
  }, [interview.id]);

  const handleRubricScoreChange = useCallback((index: number, score: number[]) => {
    setRubric((prev) => prev.map((entry, i) => i === index ? { ...entry, score: score[0] } : entry));
  }, []);

  const handleRubricCommentChange = useCallback((index: number, comment: string) => {
    setRubric((prev) => prev.map((entry, i) => i === index ? { ...entry, comment } : entry));
  }, []);

  const handleAddCategory = useCallback(() => {
    setRubric((prev) => [...prev, { category: "", score: 0, maxScore: 10, comment: "" }]);
    setRubricKeys((prev) => [...prev, keyCounter.current++]);
  }, []);

  const handleRemoveCategory = useCallback((index: number) => {
    setRubric((prev) => prev.filter((_, i) => i !== index));
    setRubricKeys((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCategoryNameChange = useCallback((index: number, category: string) => {
    setRubric((prev) => prev.map((entry, i) => i === index ? { ...entry, category } : entry));
  }, []);

  const avgScore = rubric.length > 0
    ? Math.round((rubric.reduce((sum, r) => sum + r.score, 0) / rubric.length) * 10) / 10
    : 0;

  const handleSubmit = useCallback(() => {
    const validRubric = rubric.filter((r) => r.category.trim().length > 0);
    updateInterview.mutate(
      {
        id: interview.id,
        result,
        feedback: feedback || undefined,
        rating: overallRating || avgScore,
        rubric: validRubric.length > 0 ? validRubric : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Feedback submitted");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [interview.id, result, feedback, overallRating, avgScore, rubric, updateInterview, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Interview Feedback"
      onSubmit={handleSubmit}
      submitLabel="Submit Feedback"
      isPending={updateInterview.isPending}
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Result</label>
        <Select value={result} onValueChange={(v) => setResult(v as InterviewResult)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PASSED">Passed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="NO_SHOW">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Scoring Rubric</label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Avg: {avgScore}/10</Badge>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAddCategory}>
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {rubric.map((entry, index) => (
            <div key={rubricKeys[index] ?? index} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={entry.category}
                  onChange={(e) => handleCategoryNameChange(index, e.target.value)}
                  placeholder="Category name"
                  className="h-7 text-xs font-medium flex-1"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold w-6 text-center">{entry.score}</span>
                  <span className="text-[10px] text-muted-foreground">/{entry.maxScore}</span>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveCategory(index)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Slider
                value={[entry.score]}
                onValueChange={(v) => handleRubricScoreChange(index, v)}
                max={entry.maxScore}
                step={1}
                className="w-full"
              />
              <Input
                value={entry.comment ?? ""}
                onChange={(e) => handleRubricCommentChange(index, e.target.value)}
                placeholder="Notes for this category..."
                className="h-7 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Overall Feedback</label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Strengths, weaknesses, recommendation..."
          rows={4}
        />
      </div>
    </HrSheet>
  );
}
