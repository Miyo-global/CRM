"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useDeleteCalendarEvent,
  useRsvpCalendarEvent,
  useEventAttendees,
  extractEventNumericId,
} from "@/lib/api/hooks/calendar";
import type { CalendarListItem } from "@/lib/api/hooks/calendar";
import { EventCreateDialog } from "./event-create-dialog";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function Trash2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function Tag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function Pencil({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function HelpCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#bd882c",
};

function getSafeLocationUrl(location: string): string | null {
  try {
    const parsed = new URL(location);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

interface EventDetailSheetProps {
  event: CalendarListItem | null;
  onClose: () => void;
}

const RSVP_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  declined: "Declined",
  tentative: "Tentative",
  pending: "Pending",
};

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { mutateAsync: deleteEvent, isPending: deleteEventIsPending } = useDeleteCalendarEvent();
  const { mutateAsync: rsvpMutation, isPending: rsvpMutationIsPending } = useRsvpCalendarEvent();

  const numericEventId = event ? extractEventNumericId(event.id) : null;
  const isCalendarEvent = event?.source === "event";

  const { data: attendees = [] } = useEventAttendees(isCalendarEvent ? numericEventId : null);

  const handleDelete = useCallback(async () => {
    if (!event || numericEventId === null) return;
    try {
      await deleteEvent(numericEventId);
      toast.success("Event deleted");
      onClose();
    } catch {
      toast.error("Failed to delete event");
    }
  }, [event, numericEventId, deleteEvent, onClose]);

  const handleRsvp = useCallback(
    async (status: "accepted" | "declined" | "tentative") => {
      if (!event || numericEventId === null) return;
      try {
        await rsvpMutation({ eventId: numericEventId, status });
        toast.success(`RSVP updated: ${RSVP_STATUS_LABELS[status]}`);
      } catch {
        toast.error("Failed to update RSVP");
      }
    },
    [event, numericEventId, rsvpMutation]
  );

  const colorHex = event
    ? (EVENT_COLORS[event.color ?? "blue"] ?? EVENT_COLORS.blue)
    : EVENT_COLORS.blue;

  return (
    <>
      <Sheet open={!!event} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex flex-col p-0 w-[360px] sm:max-w-[360px]">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: colorHex }}
              />
              {event?.title ?? ""}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-3">
              {event && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {event.allDay
                        ? format(new Date(event.start), "PPP")
                        : `${format(new Date(event.start), "PPp")} – ${format(new Date(event.end), "p")}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {getSafeLocationUrl(event.location) ? (
                        <a
                          href={getSafeLocationUrl(event.location)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          {event.location}
                        </a>
                      ) : (
                        <span>{event.location}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    <Badge variant="outline" className="text-xs capitalize">{event.category}</Badge>
                  </div>
                  {event.description && (
                    <>
                      <Separator />
                      <p className="text-sm text-foreground">{event.description}</p>
                    </>
                  )}
                  {event.creatorName && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground">Created by {event.creatorName}</p>
                    </>
                  )}

                  {isCalendarEvent && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your RSVP</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-950"
                            disabled={deleteEventIsPending || rsvpMutationIsPending}
                            onClick={() => handleRsvp("accepted")}
                            aria-label="Accept event"
                          >
                            <Check className="h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-yellow-600 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 dark:text-yellow-400 dark:border-yellow-900 dark:hover:bg-yellow-950"
                            disabled={rsvpMutationIsPending}
                            onClick={() => handleRsvp("tentative")}
                            aria-label="Mark as tentative"
                          >
                            <HelpCircle className="h-3 w-3" />
                            Maybe
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                            disabled={rsvpMutationIsPending}
                            onClick={() => handleRsvp("declined")}
                            aria-label="Decline event"
                          >
                            <X className="h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {attendees.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <Users className="h-3 w-3" />
                          Attendees ({attendees.length})
                        </div>
                        <div className="space-y-1.5">
                          {attendees.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={resolveImageUrl(a.user?.image ?? null)} />
                                <AvatarFallback className="text-[10px]">
                                  {(a.user?.name ?? a.user?.email ?? "?").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="flex-1 truncate text-xs">
                                {a.user?.name ?? a.user?.email ?? "Unknown"}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-4 px-1.5 capitalize ${
                                  a.status === "accepted"
                                    ? "border-green-200 text-green-600 dark:border-green-900 dark:text-green-400"
                                    : a.status === "declined"
                                      ? "border-red-200 text-red-600 dark:border-red-900 dark:text-red-400"
                                      : a.status === "tentative"
                                        ? "border-yellow-200 text-yellow-600 dark:border-yellow-900 dark:text-yellow-400"
                                        : "border-border text-muted-foreground"
                                }`}
                              >
                                {RSVP_STATUS_LABELS[a.status] ?? a.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between gap-2">
            {isCalendarEvent ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {isCalendarEvent && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Event"
        description="This will permanently delete the event. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
      <EventCreateDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        event={event}
      />
    </>
  );
}
