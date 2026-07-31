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
import { Check, X, Loader2, ExternalLink, Image as ImageIcon } from "lucide-react";
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Time Entry Details</SheetTitle>
            <SheetDescription>
              Review the time entry and approve or reject it
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b px-6">
              <Avatar className="h-10 w-10">
                <AvatarImage src={resolveImageUrl(entry.user?.image)} />
                <AvatarFallback>
                  {entry.user?.firstName?.[0]}
                  {entry.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">
                  {entry.user?.firstName} {entry.user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{entry.user?.email}</p>
              </div>
              <Badge
                variant={
                  entry.status === "APPROVED"
                    ? "default"
                    : entry.status === "REJECTED"
                    ? "destructive"
                    : "secondary"
                }
              >
                {entry.status || "PENDING"}
              </Badge>
            </div>

            <div className="space-y-4 px-6 pt-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <p className="mt-1 text-sm">{format(new Date(entry.date), "MMMM d, yyyy")}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Hours</label>
                <p className="mt-1 text-sm font-medium">{entry.hours || "0"}h</p>
              </div>

              {entry.ticket?.project && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <p className="mt-1">
                    <Badge variant="outline">{entry.ticket.project.name}</Badge>
                  </p>
                </div>
              )}

              {entry.ticketId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ticket</label>
                  <p className="mt-1 text-sm font-medium">#{entry.ticketId}</p>
                </div>
              )}

              {entry.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{entry.description}</p>
                </div>
              )}

              {entry.workLink && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Link</label>
                  <div className="mt-1">
                    <a
                      href={entry.workLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {entry.workLink}
                    </a>
                  </div>
                </div>
              )}

              {entry.imageUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Image/Attachment</label>
                  <div className="mt-2 pl-4 pt-4 pr-4">
                    <div className="relative border rounded-lg overflow-hidden bg-muted/50">
                      {(() => {
                        const imageUrl = entry.imageUrl;
                        const normalizedUrl = imageUrl.startsWith("http")
                          ? imageUrl
                          : imageUrl.startsWith("/")
                          ? imageUrl
                          : `/uploads/${imageUrl}`;
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(imageUrl);

                        return isImage && !imageError ? (
                          <div className="relative w-full max-h-[500px] flex items-center justify-center">
                            <Image
                              src={normalizedUrl}
                              alt="Work attachment"
                              width={800}
                              height={500}
                              className="w-full h-auto max-h-[500px] object-contain"
                              unoptimized
                              onError={() => setImageError(true)}
                            />
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">
                              {imageError ? "Unable to load image" : "Document attachment"}
                            </p>
                            <a
                              href={normalizedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open file
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {entry.status === "APPROVED" && entry.approvedBy && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                  <p className="mt-1 text-sm">{entry.approvedBy}</p>
                </div>
              )}

              {entry.status === "REJECTED" && entry.rejectionReason && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rejection Reason</label>
                  <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap">{entry.rejectionReason}</p>
                </div>
              )}
            </div>

            {canApproveReject && (
              <div className="pt-4 border-t flex gap-2 px-6">
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1"
                  variant="default"
                >
                  {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={handleRejectClick}
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  className="flex-1"
                  variant="destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
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
              variant="outline"
              className="flex-1"
              onClick={handleCancelReject}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
