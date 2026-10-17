"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Calendar, MapPin, Users, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/ui/empty-state";
import { isAdminOrOwner } from "@/lib/constants/roles";

interface TeamEvent {
  id: number; title: string; description: string | null; location: string | null;
  startDate: string | null; endDate: string | null; rsvpCount: number;
  isRsvped: boolean; createdAt: string | null;
}

const eventKeys = { all: [...queryKeys.hr.all, "team-events"] as const, list: () => [...eventKeys.all, "list"] as const };

export default function TeamEventsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const { data: events, isLoading, isError, error, refetch } = useQuery({
    queryKey: eventKeys.list(),
    queryFn: () => apiClient.get<TeamEvent[]>("/hr/team-events"),
  });

  const create = useMutation({
    mutationFn: (data: { title: string; description?: string; location?: string; startDate?: string; endDate?: string }) =>
      apiClient.post<TeamEvent>("/hr/team-events", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.list() }),
  });

  const rsvp = useMutation({
    mutationFn: (id: number) => apiClient.post<{ success: boolean }>(`/hr/team-events/${id}`, { action: "rsvp" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    create.mutate(
      { title: title.trim(), description: description || undefined, location: location || undefined, startDate: startDate || undefined, endDate: endDate || undefined },
      {
        onSuccess: () => {
          toast.success("Event created"); setSheetOpen(false);
          setTitle(""); setDescription(""); setLocation(""); setStartDate(""); setEndDate("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, description, location, startDate, endDate, create]);

  const handleRsvp = useCallback((id: number) => {
    rsvp.mutate(id, {
      onSuccess: () => toast.success("RSVP confirmed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [rsvp]);

  if (isLoading) {
    return (
      <PageWrapper title="Team events">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Team events"
      badge={`${events?.length ?? 0} events`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Create Event</Button> : undefined}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !events?.length ? (
        <EmptyState
          title="No upcoming events"
          description="Company events, outings, and celebrations will show up here."
          {...(isAdmin ? { action: { label: "Create Event", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {events.map((ev: TeamEvent) => (
            <Card key={ev.id} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{ev.title}</h3>
                    {ev.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{ev.description}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  {ev.startDate && <span className="flex items-center gap-1"><Calendar className="size-3.5" aria-hidden="true" />{format(new Date(ev.startDate), "MMM d, h:mm a")}</span>}
                  {ev.location && <span className="flex min-w-0 items-center gap-1"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{ev.location}</span></span>}
                  <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{ev.rsvpCount} going</span>
                </div>
                {ev.isRsvped ? (
                  <StatusPill tone="success" dot className="mt-auto h-8 w-full">Going</StatusPill>
                ) : (
                  <Button size="sm" variant="outline" className="mt-auto w-full" onClick={() => handleRsvp(ev.id)} loading={rsvp.isPending && rsvp.variables === ev.id}>
                    <UserPlus className="size-4" aria-hidden="true" />RSVP
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create event" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Event Title</label>
          <Input placeholder="e.g., Team Lunch" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Event details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Location</label>
          <Input placeholder="e.g., Conference Room A" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
