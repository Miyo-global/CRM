"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface CalendarOrgMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export function useCalendarOrgMembers() {
  return useQuery({
    queryKey: ["org", "members"],
    queryFn: () => apiClient.get<CalendarOrgMember[]>("/org/members"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGoogleMeetStatus() {
  return useQuery({
    queryKey: ["google-meet", "status"],
    queryFn: () =>
      apiClient.get<{ configured: boolean; connected: boolean; googleEmail: string | null; authUrl: string }>(
        "/calendar/create-meet"
      ),
    staleTime: 60 * 1000,
  });
}

export function useCreateMeetLink() {
  return useMutation({
    mutationFn: () => apiClient.post<{ meetLink: string }>("/calendar/create-meet", {}),
  });
}

export interface CalendarEventNotifyResult {
  attendeeCount: number;
  emailsSent: number;
  emailsSkippedNoAddress: number;
  emailFailures: number;
  mailerConfigured: boolean;
  inAppNotifications: number;
}

export interface CalendarEvent {
  id: number;
  orgId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean | null;
  color?: string | null;
  category: string;
  entityType?: string | null;
  entityId?: string | null;
  createdBy: string;
  attendeeIds?: string[] | null;
  isRecurring?: boolean | null;
  recurringRule?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  creator?: { name: string | null } | null;
}

export interface CalendarOooConflict {
  userId: string;
  userName: string | null;
  leaveStart: string;
  leaveEnd: string;
}

export type CreateCalendarEventResponse = {
  event: CalendarEvent;
  oooConflicts: CalendarOooConflict[];
  notify: CalendarEventNotifyResult;
};


export interface CalendarListItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string | null;
  category: string;
  source: "event" | "leave" | "interview" | "task" | "holiday";
  location?: string | null;
  /** Present for `source: "event"` — invited user ids from `calendar_events.attendee_ids`. */
  attendeeIds?: string[] | null;
  /** Alternate keys some payloads may use for the location / Meet URL field. */
  meetLink?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  creatorName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  myRsvpStatus?: string | null;
}


export function extractEventNumericId(id: string): number | null {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  color?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  attendeeIds?: string[];
  isRecurring?: boolean;
  recurringRule?: string;
}

export interface UpdateCalendarEventPayload extends Partial<CreateCalendarEventPayload> {
  id: number;
}

export function useCalendarEvents(start: Date, end: Date) {
  return useQuery({
    queryKey: ["calendar", "events", start.toISOString(), end.toISOString()],
    queryFn: () =>
      apiClient.get<CalendarListItem[]>("/calendar/events", {
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) =>
      apiClient.post<CreateCalendarEventResponse>("/calendar/events", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar", "events"], exact: false });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
    },
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCalendarEventPayload) =>
      apiClient.put<CalendarEvent & { notify?: CalendarEventNotifyResult }>(`/calendar/events/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar", "events"], exact: false });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: false });
    },
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ deleted: boolean }>(`/calendar/events/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["calendar", "events"], exact: false }),
  });
}

export type RsvpStatus = "accepted" | "declined" | "tentative";

export interface EventAttendee {
  id: number;
  eventId: number;
  userId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export function useEventAttendees(eventId: number | null) {
  return useQuery({
    queryKey: ["calendar", "attendees", eventId],
    queryFn: () => apiClient.get<EventAttendee[]>(`/calendar/events/${eventId}/rsvp`),
    enabled: eventId !== null,
    staleTime: 60 * 1000,
  });
}

export function useRsvpCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: number; status: RsvpStatus }) =>
      apiClient.post<EventAttendee>(`/calendar/events/${eventId}/rsvp`, { status }),
    onSuccess: (_data, { eventId }) => {
      void qc.invalidateQueries({ queryKey: ["calendar", "attendees", eventId] });
      void qc.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
