"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AbTestForm } from "./helpers";

interface AbTestFormProps {
  form: AbTestForm;
  onChange: (updated: Partial<AbTestForm>) => void;
}

export const AbTestFormFields = memo(function AbTestFormFields({
  form,
  onChange,
}: AbTestFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ab-name">Test Name</Label>
        <Input
          id="ab-name"
          placeholder="e.g. Welcome email subject test"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ab-description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="ab-description"
          placeholder="What are you testing and why?"
          rows={2}
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ab-subject-a">Variant A &mdash; Subject Line</Label>
        <Input
          id="ab-subject-a"
          placeholder="Subject line for variant A"
          value={form.variantASubject}
          onChange={(e) => onChange({ variantASubject: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ab-subject-b">Variant B &mdash; Subject Line</Label>
        <Input
          id="ab-subject-b"
          placeholder="Subject line for variant B"
          value={form.variantBSubject}
          onChange={(e) => onChange({ variantBSubject: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ab-body-a">
          Variant A &mdash; Body <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="ab-body-a"
          placeholder="Email body for variant A"
          rows={3}
          value={form.variantABody}
          onChange={(e) => onChange({ variantABody: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ab-body-b">
          Variant B &mdash; Body <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="ab-body-b"
          placeholder="Email body for variant B"
          rows={3}
          value={form.variantBBody}
          onChange={(e) => onChange({ variantBBody: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ab-split">Variant A Split %</Label>
          <Input
            id="ab-split"
            type="number"
            min={1}
            max={99}
            placeholder="50"
            value={form.splitPercent}
            onChange={(e) =>
              onChange({
                splitPercent: Math.max(1, Math.min(99, Number(e.target.value) || 50)),
              })
            }
          />
          <p className="text-[11px] text-muted-foreground">
            Variant B gets {100 - form.splitPercent}%
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ab-audience">Audience Size</Label>
          <Input
            id="ab-audience"
            type="number"
            min={0}
            max={100000000}
            placeholder="0"
            value={form.audienceSize}
            onChange={(e) =>
              onChange({ audienceSize: Math.max(0, Math.min(100000000, Number(e.target.value) || 0)) })
            }
          />
        </div>
      </div>
    </div>
  );
});
