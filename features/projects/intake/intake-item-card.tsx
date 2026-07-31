"use client";

import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  duplicate: "outline",
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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{item.title}</p>
              <Badge variant={STATUS_BADGE_VARIANT[item.status] ?? "outline"}>
                {STATUS_LABEL[item.status] ?? "Unknown"}
              </Badge>
            </div>
            {item.description != null && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {typeof item.description === "string" ? item.description : "No description available"}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {createdLabel}
              {item.submitterEmail && ` by ${item.submitterEmail}`}
            </p>
            {item.declineReason && (
              <p className="text-xs text-destructive mt-1">Reason: {item.declineReason}</p>
            )}
          </div>
          {item.status === "pending" && (
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={handleAccept}>
                <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline}>
                <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg> Decline
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDuplicate} aria-label="Mark as duplicate">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
