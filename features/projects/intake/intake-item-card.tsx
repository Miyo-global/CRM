"use client";

import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy, X } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { intakeDescriptionText } from "@/lib/projects/intake-text";
import type { Tone } from "@/lib/design/tones";

const STATUS_TONE: Record<string, Tone> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  duplicate: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  duplicate: "Duplicate",
};

interface IntakeItem {
  id: number;
  title: string;
  description?: string | null | unknown;
  status: string;
  createdAt?: string | Date | null;
  submitterEmail?: string | null;
  declineReason?: string | null;
}

interface IntakeItemCardProps {
  item: IntakeItem;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  onDuplicate: (id: number) => void;
}

export function IntakeItemCard({ item, onAccept, onDecline, onDuplicate }: IntakeItemCardProps) {
  const createdDate = item.createdAt ? new Date(item.createdAt) : null;
  const createdLabel =
    createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.toLocaleDateString() : "";
  const handleAccept = useCallback(() => onAccept(item.id), [item.id, onAccept]);
  const handleDecline = useCallback(() => onDecline(item.id), [item.id, onDecline]);
  const handleDuplicate = useCallback(() => onDuplicate(item.id), [item.id, onDuplicate]);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <StatusPill tone={STATUS_TONE[item.status] ?? "neutral"} dot className="shrink-0">
                {STATUS_LABEL[item.status] ?? "Unknown"}
              </StatusPill>
            </div>
            {item.description != null && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {intakeDescriptionText(item.description) ?? "No details given"}
              </p>
            )}
            <p className="mt-1 truncate text-xs tabular-nums text-muted-foreground">
              {createdLabel}
              {item.submitterEmail && ` by ${item.submitterEmail}`}
            </p>
            {item.declineReason && (
              <p className="mt-1 text-xs text-danger-strong">Reason: {item.declineReason}</p>
            )}
          </div>
          {item.status === "pending" && (
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="outline" onClick={handleAccept}>
                <Check aria-hidden="true" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline}>
                <X aria-hidden="true" /> Decline
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={handleDuplicate} aria-label="Mark as duplicate">
                <Copy aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
