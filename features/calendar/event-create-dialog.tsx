"use client";

import { useState, useCallback, useEffect, useMemo, useId } from "react";
import { format, parseISO, addHours, endOfDay } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useCalendarOrgMembers,
  useGoogleMeetStatus,
  useCreateMeetLink,
  extractEventNumericId,
  type CalendarEventNotifyResult,
} from "@/lib/api/hooks/calendar";
import type { CalendarListItem } from "@/lib/api/hooks/calendar";
import {
  validateCalendarTitle,
  sanitizeCalendarTitleInput,
  CALENDAR_TITLE_MIN,
  CALENDAR_TITLE_MAX,
  CALENDAR_DESC_MAX,
  getCalendarEventFormRangeError,
  shouldShowMeetConnect,
  shouldShowMeetGenerate,
  isValidUrl,
} from "@/lib/validations/calendar-event";
import { isAllowedNameChar } from "@/lib/validations/text-rules";
import { toast } from "sonner";

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Video({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
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

const EVENT_CATEGORIES = [
  "general",
  "meeting",
  "deadline",
  "reminder",
  "leave",
  "project",
  "other",
] as const;

type EventCategory = (typeof EVENT_CATEGORIES)[number];

interface FormState {
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  color: string;
  category: EventCategory;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attendeeIds: string[];
}

function toDefaultForm(slot?: { start: Date; end: Date } | null): FormState {
  const start = slot?.start ?? new Date();
  const end = slot?.end ?? addHours(start, 1);
  return {
    title: "",
    description: "",
    location: "",
    allDay: false,
    color: "blue",
    category: "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    attendeeIds: [],
  };
}

/** Prefer `location`; accept alternate API keys for Meet / meeting URL. */
function resolveLocationField(event: CalendarListItem): string {
  const loc = event.location?.trim();
  if (loc) return loc;
  const meet = event.meetLink?.trim();
  if (meet) return meet;
  return event.meetingUrl?.trim() ?? "";
}

function toEditForm(event: CalendarListItem): FormState {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const fromEvent = Array.isArray(event.attendeeIds) ? event.attendeeIds.filter(Boolean) : [];
  return {
    title: sanitizeCalendarTitleInput(event.title),
    description: event.description ?? "",
    location: resolveLocationField(event),
    allDay: event.allDay ?? false,
    color: event.color ?? "blue",
    category: (event.category as EventCategory) ?? "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    attendeeIds: fromEvent,
  };
}

function getMemberName(member: { firstName: string | null; lastName: string | null; name: string | null }) {
  if (member.firstName) return `${member.firstName} ${member.lastName ?? ""}`.trim();
  return member.name ?? "Unknown";
}

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSlot?: { start: Date; end: Date } | null;
  event?: CalendarListItem | null;
}

function calendarNotifyDescription(n: CalendarEventNotifyResult): string {
  const parts: string[] = [];
  if (n.inAppNotifications > 0) {
    parts.push(`In-app alert for ${n.inAppNotifications} attendee(s)`);
  }
  if (n.mailerConfigured) {
    if (n.emailsSent > 0) parts.push(`Email sent to ${n.emailsSent}`);
    if (n.emailFailures > 0) parts.push(`${n.emailFailures} email(s) failed — check logs`);
    if (n.emailsSkippedNoAddress > 0) parts.push(`${n.emailsSkippedNoAddress} without email on file`);
  } else if (n.attendeeCount > 0) {
    parts.push("Outbound email is not configured on the server");
  }
  return parts.join(" · ");
}

export function EventCreateDialog({ open, onOpenChange, defaultSlot, event }: EventCreateDialogProps) {
  const isEdit = !!event;
  const colorSelectId = useId();
  const colorFieldDescId = useId();

  const [form, setForm] = useState<FormState>(() =>
    isEdit ? toEditForm(event!) : toDefaultForm(defaultSlot)
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const { data: members = [] } = useCalendarOrgMembers();
  const { data: meetStatus } = useGoogleMeetStatus();
  const createMeet = useCreateMeetLink();

  useEffect(() => {
    if (open) {
      if (isEdit && event) {
        setForm(toEditForm(event));
      } else {
        setForm(toDefaultForm(defaultSlot));
      }
      setTitleError(null);
      setDescError(null);
      setAttendeeSearch("");
    }
  }, [open, defaultSlot, event, isEdit]);

  const handleSheetOpenChange = useCallback(
    (v: boolean) => {
      if (!v) onOpenChange(false);
    },
    [onOpenChange],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAttendee = useCallback((memberId: string) => {
    setForm((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(memberId)
        ? prev.attendeeIds.filter((id) => id !== memberId)
        : [...prev.attendeeIds, memberId],
    }));
  }, []);

  const handleGenerateMeet = useCallback(async () => {
    try {
      const res = await createMeet.mutateAsync();
      set("location", res.meetLink);
    } catch {
      toast.error("Failed to generate Meet link");
    }
  }, [createMeet, set]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isAllowedNameChar(e.key)) {
      e.preventDefault();
    }
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleError(null);
    set("title", sanitizeCalendarTitleInput(e.target.value));
  }, [set]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > CALENDAR_DESC_MAX) {
      setDescError(`Description cannot exceed ${CALENDAR_DESC_MAX} characters`);
    } else {
      setDescError(null);
    }
    set("description", val);
  }, [set]);

  const handleLocationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("location", e.target.value);
  }, [set]);

  const handleAllDayChange = useCallback((v: boolean) => {
    set("allDay", v);
  }, [set]);

  const handleStartDateChange = useCallback((v: string) => {
    set("startDate", v);
  }, [set]);

  const handleStartTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("startTime", e.target.value);
  }, [set]);

  const handleEndDateChange = useCallback((v: string) => {
    set("endDate", v);
  }, [set]);

  const handleEndTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set("endTime", e.target.value);
  }, [set]);

  const handleCategoryChange = useCallback((v: string) => {
    set("category", v as EventCategory);
  }, [set]);

  const handleColorChange = useCallback((v: string) => {
    set("color", v);
  }, [set]);

  const filteredMembers = useMemo(() => {
    const q = attendeeSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = getMemberName(m).toLowerCase();
      const mail = (m.email || "").toLowerCase();
      return name.includes(q) || mail.includes(q);
    });
  }, [members, attendeeSearch]);

  const showMeetGenerate = shouldShowMeetGenerate(meetStatus);
  const showMeetConnect = shouldShowMeetConnect(meetStatus);
  const connectButtonDisabled = !meetStatus?.authUrl || !isValidUrl(meetStatus.authUrl);

  const scheduleError = useMemo(
    () =>
      getCalendarEventFormRangeError({
        allDay: form.allDay,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
      }),
    [form.allDay, form.startDate, form.endDate, form.startTime, form.endTime],
  );

  const liveTitleError = useMemo(() => {
    if (!form.title.trim()) return null;
    return validateCalendarTitle(form.title);
  }, [form.title]);

  const displayedTitleError = titleError ?? liveTitleError;

  const handleSave = useCallback(async () => {
    const trimmedTitle = form.title.trim();
    const titleValidationError = validateCalendarTitle(form.title);
    if (titleValidationError) {
      toast.error(titleValidationError);
      setTitleError(titleValidationError);
      return;
    }
    setTitleError(null);

    if (form.description.length > CALENDAR_DESC_MAX) {
      toast.error(`Description cannot exceed ${CALENDAR_DESC_MAX} characters`);
      return;
    }

    const scheduleErr = getCalendarEventFormRangeError({
      allDay: form.allDay,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.startTime,
      endTime: form.endTime,
    });
    if (scheduleErr) {
      toast.error(scheduleErr);
      return;
    }

    let startDate: Date;
    let endDate: Date;
    if (form.allDay) {
      startDate = parseISO(`${form.startDate}T00:00:00`);
      endDate =
        form.startDate === form.endDate
          ? endOfDay(startDate)
          : endOfDay(parseISO(`${form.endDate}T00:00:00`));
    } else {
      startDate = parseISO(`${form.startDate}T${form.startTime}`);
      endDate = parseISO(`${form.endDate}T${form.endTime}`);
    }

    const payload = {
      title: trimmedTitle,
      description: form.description || undefined,
      location: form.location || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      allDay: form.allDay,
      color: form.color,
      category: form.category,
      attendeeIds: form.attendeeIds,
    };
    try {
      if (isEdit && event) {
        const numericId = extractEventNumericId(event.id);
        if (numericId === null) {
          toast.error("Cannot edit this event type");
          return;
        }
        const updated = await updateEvent.mutateAsync({ id: numericId, ...payload });
        if (updated.notify && updated.notify.attendeeCount > 0) {
          toast.success("Event updated", { description: calendarNotifyDescription(updated.notify) });
        } else {
          toast.success("Event updated");
        }
      } else {
        const created = await createEvent.mutateAsync(payload);
        if (created.notify && created.notify.attendeeCount > 0) {
          toast.success("Event created", { description: calendarNotifyDescription(created.notify) });
        } else {
          toast.success("Event created");
        }
      }
      handleClose();
    } catch {
      toast.error(isEdit ? "Failed to update event" : "Failed to create event");
    }
  }, [form, isEdit, event, createEvent, updateEvent, handleClose]);

  const isPending = isEdit ? updateEvent.isPending : createEvent.isPending;

  const saveDisabled =
    isPending ||
    form.title.trim().length < CALENDAR_TITLE_MIN ||
    !/[a-zA-Z]/.test(form.title) ||
    form.title.length > CALENDAR_TITLE_MAX ||
    form.description.length > CALENDAR_DESC_MAX ||
    !!scheduleError;

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 w-full sm:max-w-[480px]">
        <SheetHeader className="px-6 border-b shrink-0">
          <SheetTitle className="text-base font-semibold">
            {isEdit ? "Edit Event" : "New Calendar Event"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title" className="text-xs font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Event title (min. 5, max 100 characters)"
                maxLength={CALENDAR_TITLE_MAX}
                className={cn("h-9", displayedTitleError && "border-destructive focus-visible:ring-destructive")}
                autoFocus
                aria-invalid={!!displayedTitleError}
                aria-describedby={displayedTitleError ? "ev-title-error" : "ev-title-hint"}
              />
              {displayedTitleError ? (
                <p id="ev-title-error" role="alert" className="text-[11px] text-destructive">
                  {displayedTitleError}
                </p>
              ) : (
                <p id="ev-title-hint" className="text-[11px] text-muted-foreground">
                  Use letters in the title; numbers-only titles are not allowed.
                </p>
              )}
              <p className="text-[10px] text-muted-foreground text-right">
                {form.title.length}/{CALENDAR_TITLE_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-desc" className="text-xs font-medium">Description</Label>
              <Input
                id="ev-desc"
                value={form.description}
                onChange={handleDescriptionChange}
                placeholder="Optional description"
                className={cn("h-9", descError && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={!!descError}
                aria-describedby={descError ? "ev-desc-error" : undefined}
              />
              {descError && (
                <p id="ev-desc-error" className="text-[11px] text-destructive">
                  {descError}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground text-right">
                {form.description.length}/{CALENDAR_DESC_MAX}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-location" className="text-xs font-medium">Location / Meet Link</Label>
              <div className="flex gap-2">
                <Input
                  id="ev-location"
                  value={form.location}
                  onChange={handleLocationChange}
                  placeholder="Room A, Zoom link, https://meet.google.com/..."
                  className="h-9 flex-1"
                />
                {showMeetGenerate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 gap-1.5"
                      disabled={createMeet.isPending}
                      onClick={handleGenerateMeet}
                    >
                      {createMeet.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Video className="h-3.5 w-3.5" />}
                      Meet
                    </Button>
                )}
                {showMeetConnect && (
                    <a
                      href={connectButtonDisabled ? undefined : meetStatus?.authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                      aria-disabled={connectButtonDisabled}
                      tabIndex={connectButtonDisabled ? -1 : undefined}
                      onClick={connectButtonDisabled ? (e) => e.preventDefault() : undefined}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        disabled={connectButtonDisabled}
                      >
                        <Video className="h-3.5 w-3.5" />
                        Connect
                      </Button>
                    </a>
                )}
              </div>
              {meetStatus?.connected && meetStatus.googleEmail && (
                <p className="text-[11px] text-muted-foreground">Google: {meetStatus.googleEmail}</p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Switch id="ev-allday" checked={form.allDay} onCheckedChange={handleAllDayChange} />
              <Label htmlFor="ev-allday" className="text-sm cursor-pointer">All day event</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start-date" className="text-xs font-medium">Start Date</Label>
                <DatePicker
                  id="ev-start-date"
                  value={form.startDate}
                  onChange={handleStartDateChange}
                  placeholder="Start date"
                  invalid={!!(form.allDay && scheduleError)}
                  ariaDescribedBy={scheduleError ? "ev-schedule-error" : undefined}
                  className={cn(form.allDay && scheduleError && "border-destructive focus-visible:ring-destructive")}
                />
              </div>
              {!form.allDay && (
                <div className="space-y-1.5">
                  <Label htmlFor="ev-start-time" className="text-xs font-medium">
                    Start Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ev-start-time"
                    type="time"
                    className={cn("h-9", scheduleError && "border-destructive focus-visible:ring-destructive")}
                    value={form.startTime}
                    onChange={handleStartTimeChange}
                    required
                    aria-invalid={!!scheduleError}
                    aria-describedby={scheduleError ? "ev-schedule-error" : undefined}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="ev-end-date" className="text-xs font-medium">End Date</Label>
                <DatePicker
                  id="ev-end-date"
                  value={form.endDate}
                  onChange={handleEndDateChange}
                  fromDate={form.startDate ? new Date(form.startDate) : undefined}
                  placeholder="End date"
                  invalid={!!(form.allDay && scheduleError)}
                  ariaDescribedBy={scheduleError ? "ev-schedule-error" : undefined}
                  className={cn(form.allDay && scheduleError && "border-destructive focus-visible:ring-destructive")}
                />
              </div>
              {!form.allDay && (
                <div className="space-y-1.5">
                  <Label htmlFor="ev-end-time" className="text-xs font-medium">
                    End Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ev-end-time"
                    type="time"
                    className={cn("h-9", scheduleError && "border-destructive focus-visible:ring-destructive")}
                    value={form.endTime}
                    onChange={handleEndTimeChange}
                    required
                    aria-invalid={!!scheduleError}
                    aria-describedby={scheduleError ? "ev-schedule-error" : undefined}
                  />
                </div>
              )}
            </div>
            {scheduleError ? (
              <p id="ev-schedule-error" role="alert" className="text-[11px] text-destructive -mt-3">
                {scheduleError}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={form.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="capitalize">{cat}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={colorSelectId} className="text-xs font-medium">
                  Color
                  <span className="font-normal text-muted-foreground"> (calendar)</span>
                </Label>
                <Select value={form.color} onValueChange={handleColorChange}>
                  <SelectTrigger
                    id={colorSelectId}
                    className="h-9 w-full"
                    aria-describedby={colorFieldDescId}
                  >
                    <SelectValue placeholder="Color">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full border border-black/10 dark:border-white/15"
                          style={{
                            backgroundColor: EVENT_COLORS[form.color] ?? EVENT_COLORS.blue,
                          }}
                          aria-hidden
                        />
                        <span className="capitalize truncate">{form.color}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_COLORS).map(([key, hex]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                          <span className="capitalize">{key}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p id={colorFieldDescId} className="text-xs text-muted-foreground leading-snug">
                  Sets the fill color of this event&apos;s block on the calendar grid so it&apos;s easy to spot.
                </p>
              </div>
            </div>

            {members.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium">Attendees</Label>
                  {form.attendeeIds.length > 0 && (
                    <Badge variant="secondary" className="text-[11px] shrink-0">
                      {form.attendeeIds.length} selected
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="h-9 pl-8 text-sm"
                    aria-label="Search attendees"
                  />
                </div>
                <div className="rounded-lg border bg-muted/30 p-1 space-y-0.5 max-h-48 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3 px-2">No matching people</p>
                  ) : (
                    filteredMembers.map((member) => {
                      const name = getMemberName(member);
                      const selected = form.attendeeIds.includes(member.id);
                      return (
                        <AttendeeRow
                          key={member.id}
                          memberId={member.id}
                          name={name}
                          email={member.email}
                          image={member.image}
                          selected={selected}
                          onToggle={toggleAttendee}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 border-t shrink-0 flex-row gap-2 justify-end">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saveDisabled}
          >
            {isPending
              ? (isEdit ? "Saving..." : "Creating...")
              : (isEdit ? "Save Changes" : "Create Event")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface AttendeeRowProps {
  memberId: string;
  name: string;
  email?: string;
  image: string | null | undefined;
  selected: boolean;
  onToggle: (id: string) => void;
}

function AttendeeRow({ memberId, name, email, image, selected, onToggle }: AttendeeRowProps) {
  const handleClick = useCallback(() => {
    onToggle(memberId);
  }, [memberId, onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-left",
        selected ? "bg-gold/10 ring-1 ring-gold/30" : "hover:bg-muted"
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={resolveImageUrl(image)} />
        <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="flex-1 min-w-0 text-left">
        <span className={cn("block truncate text-sm", selected && "font-medium")}>{name}</span>
        {email ? (
          <span className="block truncate text-[10px] text-muted-foreground">{email}</span>
        ) : null}
      </span>
      <div className={cn(
        "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
        selected ? "border-gold bg-gold" : "border-muted-foreground/30"
      )}>
        {selected && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
    </button>
  );
}
