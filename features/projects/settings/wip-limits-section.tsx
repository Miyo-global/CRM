"use client";

import { useState } from "react";
import { Columns3 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUpdateWipLimit } from "@/lib/api/hooks/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ProjectStatusRecord } from "@/types/projects";

function WipRow({ projectId, status, disabled }: { projectId: number; status: ProjectStatusRecord; disabled: boolean }) {
  const [value, setValue] = useState(status.wipLimit?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateWipLimit(projectId);

  const save = () => {
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isInteger(next) || next < 1 || next > 500)) {
      setError("Use a whole number from 1 to 500, or leave it empty");
      return;
    }
    setError(null);
    if (next === status.wipLimit) return;
    update.mutate(
      { statusId: status.id, wipLimit: next },
      {
        onSuccess: () => toast.success(next === null ? `Removed the limit on ${status.name}` : `Set ${status.name} to ${next} tickets`),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const id = `wip-${status.id}`;
  return (
    <li className="grid gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
      <label htmlFor={id} className="text-sm font-medium">{status.name.replace(/_/g, " ")}</label>
      <div>
        <Input
          id={id}
          inputMode="numeric"
          placeholder="No limit"
          value={value}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        {error && <p id={`${id}-error`} className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </li>
  );
}

export function WipLimitsSection({ projectId, statuses, canManage }: { projectId: number; statuses: ProjectStatusRecord[]; canManage: boolean }) {
  return (
    <Card>
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Columns3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold leading-tight">Board columns</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A work-in-progress limit stops people from moving more tickets into a column once it is full.
        </p>
      </div>
      {statuses.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">This project has no board columns.</p>
      ) : (
        <ul className="divide-y divide-border">
          {[...statuses].sort((a, b) => a.order - b.order).map((s) => (
            <WipRow key={s.id} projectId={projectId} status={s} disabled={!canManage} />
          ))}
        </ul>
      )}
    </Card>
  );
}
