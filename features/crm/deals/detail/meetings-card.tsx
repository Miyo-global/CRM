"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Video, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Meeting {
  id: number;
  title: string;
  scheduledAt: string;
  durationMinutes: number | null;
  status: string;
  attendees: string[] | null;
  agenda: string | null;
  notes: string | null;
  recordingLink: string | null;
}

interface MeetingsCardProps {
  meetings: Meeting[] | undefined;
  onAddMeeting: () => void;
  onDeleteMeeting: (id: number) => void;
}

export function MeetingsCard({ meetings, onAddMeeting, onDeleteMeeting }: MeetingsCardProps) {
  return (
    <Card className="shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Meetings</CardTitle>
        <Button size="sm" variant="outline" onClick={onAddMeeting}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {!meetings?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No meetings scheduled</p>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{m.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{m.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(m.scheduledAt), "dd MMM yyyy, HH:mm")}
                    {m.durationMinutes ? ` · ${m.durationMinutes}min` : ""}
                  </p>
                  {m.agenda && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.agenda}</p>}
                  {m.recordingLink && (
                    <a href={m.recordingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:underline flex items-center gap-1 mt-1">
                      <Video className="h-3 w-3" /> Recording <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onDeleteMeeting(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
