"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

const TYPES = ["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"] as const;

/** MIYO-0656: schedule a round. Times are entered and shown in IST. */
export function ScheduleInterviewDialog({
  applicationId,
  jobTitle,
  people,
}: {
  applicationId: number;
  jobTitle: string;
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<string>("VIDEO");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(60);
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");

  async function schedule(force: boolean) {
    if (!when) {
      toast.error("Pick a date and time.");
      return;
    }
    setBusy(true);
    try {
      // The input is local time; the browser sends the instant.
      const res = await fetch("/api/ats/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          type,
          scheduledAt: new Date(when).toISOString(),
          duration,
          interviewerIds,
          meetingUrl: meetingUrl || undefined,
          location: location || undefined,
          force,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(body?.error ?? "Clash", {
          action: { label: "Schedule anyway", onClick: () => void schedule(true) },
        });
        return;
      }
      if (!res.ok) {
        toast.error(body?.error ?? "Could not schedule the interview.");
        return;
      }
      toast.success("Scheduled. The invite is on its way.");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Schedule interview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule an interview</DialogTitle>
          <DialogDescription>{jobTitle}. Times are IST.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Round</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="when">Date and time</Label>
            <Input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="duration">Minutes</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Interviewers</Label>
            <SearchableMultiSelect
              options={people.map((p) => ({ value: p.id, label: p.name }))}
              values={interviewerIds}
              onValuesChange={setInterviewerIds}
              placeholder="Who is meeting them"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meetingUrl">Meeting link</Label>
            <Input
              id="meetingUrl"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Or a place</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office, 3rd floor"
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={busy || interviewerIds.length === 0} onClick={() => void schedule(false)}>
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
