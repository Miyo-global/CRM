"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ExternalLink } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { PropertyList } from "@/components/shared/property-list";
import type { Tone } from "@/lib/design/tones";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import {
  useApproveTimesheet,
  useRejectTimesheet,
} from "@/lib/api/hooks/projects";
import type { TimeEntryWithUser } from "@/types/projects";

interface TimeEntryDetailSheetProps {
  entry: TimeEntryWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeEntryDetailSheet({ entry, open, onOpenChange }: TimeEntryDetailSheetProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [imageError, setImageError] = useState(false);

  const approveMutation = useApproveTimesheet();
  const rejectMutation = useRejectTimesheet();

  const handleApprove = () => {
    if (!entry) return;
    approveMutation.mutate(
      { timesheetId: entry.id },
      {
        onSuccess: () => {
          toast.success("Timesheet approved successfully");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  };

  const handleRejectClick = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!entry) return;
    rejectMutation.mutate(
      {
        timesheetId: entry.id,
        reason: rejectionReason,
      },
      {
        onSuccess: () => {
          toast.success("Timesheet rejected");
          setRejectDialogOpen(false);
          setRejectionReason("");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      }
    );
  };

  const handleCancelReject = useCallback(() => {
    setRejectDialogOpen(false);
    setRejectionReason("");
  }, []);

  const handleRejectionReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRejectionReason(e.target.value);
  }, []);

  if (!entry) return null;

  const canApproveReject = !entry.status || entry.status === "PENDING";
  const statusKey = entry.status || "PENDING";
  const statusTone: Tone = statusKey === "APPROVED" ? "success" : statusKey === "REJECTED" ? "danger" : "warning";

  const properties: { label: string; value: React.ReactNode }[] = [
    { label: "Date", value: <span className="tabular-nums">{format(new Date(entry.date), "MMMM d, yyyy")}</span> },
    { label: "Hours", value: <span className="font-medium tabular-nums">{entry.hours || "0"}h</span> },
  ];
  if (entry.ticket?.project) {
    properties.push({ label: "Project", value: <Badge variant="outline">{entry.ticket.project.name}</Badge> });
  }
  if (entry.ticketId) {
    properties.push({ label: "Ticket", value: <span className="font-mono font-medium">#{entry.ticketId}</span> });
  }
  if (entry.workLink) {
    properties.push({
      label: "Work Link",
      value: (
        <a
          href={entry.workLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 break-all text-brand-text hover:underline"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
          {entry.workLink}
        </a>
      ),
    });
  }
  if (entry.status === "APPROVED" && entry.approvedBy) {
    properties.push({ label: "Approved By", value: entry.approvedBy });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" size="md" className="gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>Time Entry Details</SheetTitle>
            <SheetDescription>
              Review the time entry and approve or reject it
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={resolveImageUrl(entry.user?.image)} />
                <AvatarFallback>
                  {entry.user?.firstName?.[0]}
                  {entry.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {entry.user?.firstName} {entry.user?.lastName}
                </p>
                <p className="truncate text-sm text-muted-foreground">{entry.user?.email}</p>
              </div>
              <StatusPill tone={statusTone} dot>
                {entry.status || "PENDING"}
              </StatusPill>
            </div>

            <PropertyList items={properties} />

            {entry.description && (
              <section className="space-y-1.5">
                <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
                <p className="whitespace-pre-wrap text-sm">{entry.description}</p>
              </section>
            )}

            {entry.status === "REJECTED" && entry.rejectionReason && (
              <section className="space-y-1.5 rounded-lg bg-danger-soft p-3">
                <h3 className="text-2xs font-semibold uppercase tracking-wider text-danger-strong">Rejection Reason</h3>
                <p className="whitespace-pre-wrap text-sm text-danger-strong">{entry.rejectionReason}</p>
              </section>
            )}

            {entry.imageUrl && (
              <section className="space-y-2">
                <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Work Image/Attachment</h3>
                <div className="relative overflow-hidden rounded-lg border bg-surface-sunken/40">
                  {(() => {
                    const imageUrl = entry.imageUrl;
                    const normalizedUrl = imageUrl.startsWith("http")
                      ? imageUrl
                      : imageUrl.startsWith("/")
                      ? imageUrl
                      : `/uploads/${imageUrl}`;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl);

                    return isImage && !imageError ? (
                      <div className="relative flex max-h-125 w-full items-center justify-center">
                        <Image
                          src={normalizedUrl}
                          alt="Work attachment"
                          width={800}
                          height={500}
                          className="h-auto max-h-125 w-full object-contain"
                          unoptimized
                          onError={() => setImageError(true)}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          {imageError ? "Unable to load image" : "Document attachment"}
                        </p>
                        <a
                          href={normalizedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-brand-text hover:underline"
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                          Open file
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}
          </div>

          {canApproveReject && (
            <SheetFooter>
              <Button
                onClick={handleRejectClick}
                disabled={rejectMutation.isPending || approveMutation.isPending}
                variant="destructive"
              >
                <X className="size-4" aria-hidden="true" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                loading={approveMutation.isPending}
                disabled={rejectMutation.isPending}
              >
                {!approveMutation.isPending && <Check className="size-4" aria-hidden="true" />}
                Approve
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <SheetContent size="sm">
          <SheetHeader>
            <SheetTitle>Reject Timesheet</SheetTitle>
            <SheetDescription>
              Please provide a reason for rejecting this timesheet entry.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={handleRejectionReasonChange}
              rows={4}
            />
          </div>
          <SheetFooter>
            <Button
              variant="ghost"
              onClick={handleCancelReject}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
              loading={rejectMutation.isPending}
            >
              Reject
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
