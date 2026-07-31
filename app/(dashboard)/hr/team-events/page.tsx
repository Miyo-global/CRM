"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, PartyPopper, Calendar, MapPin, Users, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

interface TeamEvent {
  id: number; title: string; description: string | null; location: string | null;
  startDate: string | null; endDate: string | null; rsvpCount: number;
  isRsvped: boolean; createdAt: string | null;
}

const eventKeys = { all: [...queryKeys.hr.all, "team-events"] as const, list: () => [...eventKeys.all, "list"] as const };

export default function TeamEventsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR";

  const { data: events, isLoading } = useQuery({
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
      <PageWrapper title="Team Events" subtitle="Company events and celebrations">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Team Events"
      subtitle="Company events, outings, and celebrations"
      badge={`${events?.length ?? 0} events`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Create Event</Button> : undefined}
    >
      {!events?.length ? (
        <EmptyState
          illustration={<EmptyCalendarIllustration className="h-32 w-32 opacity-95" />}
          title="No upcoming events"
          description="Company events, outings, and celebrations will show up here."
          {...(isAdmin ? { action: { label: "Create Event", onClick: () => setSheetOpen(true) } } : {})}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev: TeamEvent) => (
            <Card key={ev.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold leading-tight">{ev.title}</h3>
                {ev.description && <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>}
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {ev.startDate && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{format(new Date(ev.startDate), "MMM d, h:mm a")}</span>}
                  {ev.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{ev.location}</span>}
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{ev.rsvpCount} going</span>
                </div>
                {ev.isRsvped ? (
                  <Badge variant="default" className="text-[10px] w-full justify-center">Going</Badge>
                ) : (
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => handleRsvp(ev.id)}>
                    <UserPlus className="h-3 w-3 mr-1" />RSVP
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Event" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
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
        <div className="grid grid-cols-2 gap-3">
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
