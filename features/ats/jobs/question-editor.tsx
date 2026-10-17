"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface QuestionDraft {
  id?: number;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  /** A single-select answer that must be given, or the application ends. */
  knockoutEquals: string;
}

const TYPE_LABELS: Record<string, string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  SELECT: "Choose one",
  MULTISELECT: "Choose several",
  BOOLEAN: "Yes or no",
  NUMBER: "Number",
  FILE: "File",
};

/** MIYO-0635: the questions this job adds to the apply form. */
export function QuestionEditor({
  jobId,
  initial,
}: {
  jobId: number;
  initial: QuestionDraft[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial);
  const [busy, setBusy] = useState(false);

  const update = (index: number, patch: Partial<QuestionDraft>) =>
    setQuestions((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/ats/jobs/${jobId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: questions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            options: q.options.filter(Boolean),
            required: q.required,
            knockout: q.knockoutEquals.trim()
              ? { equals: q.knockoutEquals.trim() }
              : undefined,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error ?? "Could not save the questions.");
        return;
      }
      toast.success("Questions saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-2xl gap-4">
      {questions.map((question, index) => (
        <Card key={question.id ?? `new-${index}`}>
          <CardContent className="grid gap-4 p-5">
            <div className="grid gap-2">
              <Label htmlFor={`label-${index}`}>Question</Label>
              <Input
                id={`label-${index}`}
                value={question.label}
                onChange={(e) => update(index, { label: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`type-${index}`}>Answer</Label>
                <Select
                  value={question.type}
                  onValueChange={(value) => update(index, { type: value })}
                >
                  <SelectTrigger id={`type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(question.type === "SELECT" || question.type === "MULTISELECT") && (
                <div className="grid gap-2">
                  <Label htmlFor={`options-${index}`}>Options, comma separated</Label>
                  <Input
                    id={`options-${index}`}
                    value={question.options.join(", ")}
                    onChange={(e) =>
                      update(index, {
                        options: e.target.value.split(",").map((o) => o.trim()),
                      })
                    }
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={question.required}
                onCheckedChange={(checked) => update(index, { required: checked === true })}
              />
              Must be answered
            </label>

            <div className="grid gap-2">
              <Label htmlFor={`knockout-${index}`}>Only accept this answer (optional)</Label>
              <Input
                id={`knockout-${index}`}
                value={question.knockoutEquals}
                onChange={(e) => update(index, { knockoutEquals: e.target.value })}
                placeholder="e.g. Yes"
              />
              <p className="text-xs text-muted-foreground">
                An application with a different answer is turned down at the form, with a
                neutral message.
              </p>
            </div>

            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuestions((rows) => rows.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() =>
            setQuestions((rows) => [
              ...rows,
              { label: "", type: "TEXT", options: [], required: false, knockoutEquals: "" },
            ])
          }
        >
          Add a question
        </Button>
        <Button disabled={busy} onClick={() => void save()}>
          Save questions
        </Button>
      </div>
    </div>
  );
}
