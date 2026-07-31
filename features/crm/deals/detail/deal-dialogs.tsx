"use client";

import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, FolderKanban } from "lucide-react";


interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    attendees: string[];
    agenda?: string;
    notes?: string;
    actionItems?: string;
    recordingLink?: string;
  }) => void;
  isPending: boolean;
}

export function MeetingDialog({ open, onOpenChange, onSubmit, isPending }: MeetingDialogProps) {
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [attendees, setAttendees] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [recordingLink, setRecordingLink] = useState("");

  const handleSubmit = useCallback(() => {
    onSubmit({
      title,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes: duration,
      attendees: attendees.split(",").map((a) => a.trim()).filter(Boolean),
      agenda: agenda || undefined,
      notes: notes || undefined,
      actionItems: actionItems || undefined,
      recordingLink: recordingLink || undefined,
    });
  }, [title, scheduledAt, duration, attendees, agenda, notes, actionItems, recordingLink, onSubmit]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setTitle(""); setScheduledAt(""); setDuration(30); setAttendees("");
      setAgenda(""); setNotes(""); setActionItems(""); setRecordingLink("");
    }
    onOpenChange(open);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Log Meeting
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Meeting title..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" min={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Attendees (comma-separated)</Label>
            <Input placeholder="John, Sarah, Mike..." value={attendees} onChange={(e) => setAttendees(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Agenda</Label>
            <Textarea rows={2} placeholder="Meeting agenda..." value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Meeting notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Action Items</Label>
            <Textarea rows={2} placeholder="Follow-ups..." value={actionItems} onChange={(e) => setActionItems(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Recording Link (optional)</Label>
            <Input type="url" placeholder="https://..." value={recordingLink} onChange={(e) => setRecordingLink(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save Meeting"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSubmit: (data: { name: string; startDate?: string; endDate?: string }) => void;
  isPending: boolean;
}

export function CreateProjectDialog({ open, onOpenChange, defaultName, onSubmit, isPending }: CreateProjectDialogProps) {
  const [name, setName] = useState(defaultName);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  const handleSubmit = useCallback(() => {
    onSubmit({
      name,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [name, startDate, endDate, onSubmit]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) { setName(defaultName); setStartDate(""); setEndDate(""); }
    onOpenChange(open);
  }, [onOpenChange, defaultName]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" /> Create Project from Deal
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Project Name *</Label>
            <Input placeholder="e.g. Website Redesign" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create Project"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
