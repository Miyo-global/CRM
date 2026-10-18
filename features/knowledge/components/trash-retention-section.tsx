"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKbSettings, useUpdateKbSettings } from "@/lib/api/hooks/knowledge";

/**
 * KB-0086: how long trash is kept.
 *
 * Shown on the trash page rather than buried in settings, because this is the
 * number that decides whether what is on this screen still exists tomorrow.
 */
export function TrashRetentionSection() {
  const settings = useKbSettings();
  const updateSettings = useUpdateKbSettings();
  const [days, setDays] = useState<string | null>(null);

  const current = settings.data?.trashRetentionDays;
  const value = days ?? (current != null ? String(current) : "");

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="trash-retention">Keep deleted pages for</Label>
        <div className="flex items-center gap-2">
          <Input
            id="trash-retention"
            type="number"
            min={1}
            max={365}
            value={value}
            onChange={(event) => setDays(event.target.value)}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </div>

      <Button
        size="sm"
        disabled={updateSettings.isPending || value === "" || Number(value) === current}
        onClick={() => {
          const parsed = Number(value);
          if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
            toast.error("Pick between 1 and 365 days.");
            return;
          }
          updateSettings.mutate(
            { trashRetentionDays: parsed },
            {
              onSuccess: () => {
                setDays(null);
                toast.success("Saved");
              },
              onError: () => toast.error("Couldn't save that."),
            },
          );
        }}
      >
        Save
      </Button>

      <p className="w-full text-xs text-muted-foreground">
        After this, a deleted page is removed for good by the nightly sweep. Pages on legal hold are
        never removed.
      </p>
    </section>
  );
}
