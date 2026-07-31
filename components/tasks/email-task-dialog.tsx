"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompleteTask, type TaskWithBucket } from "@/lib/api/hooks/tasks";
import { useLeadDetail } from "@/lib/api/hooks/leads";
import { toast } from "sonner";
import { Mail } from "lucide-react";

interface EmailTaskDialogProps {
  task: TaskWithBucket;
  onClose: () => void;
}

export function EmailTaskDialog({ task, onClose }: EmailTaskDialogProps) {
  const isLeadTask = task.entityType === "LEAD" && !!task.entityId;
  const { data: lead } = useLeadDetail(isLeadTask ? task.entityId! : 0);

  const [to, setTo] = useState(lead?.email ?? "");
  const [subject, setSubject] = useState(`Follow-up: ${task.title}`);
  const [body, setBody] = useState("");
  const [emailOpened, setEmailOpened] = useState(false);
  const completeTask = useCompleteTask();

  const resolvedTo = to || lead?.email || "";

  function handleOpenEmail() {
    if (!resolvedTo.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    window.open(
      `mailto:${encodeURIComponent(resolvedTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank",
    );
    setEmailOpened(true);
  }

  function handleConfirmSent() {
    completeTask.mutate(
      { taskId: task.id },
      {
        onSuccess: () => {
          toast.success("Task marked complete");
          onClose();
        },
        onError: () => toast.error("Failed to complete task"),
      },
    );
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-500" />
            Send Email
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-3 py-2 px-4">
          {lead && (
            <p className="text-xs text-muted-foreground">
              Lead: <strong>{lead.name}</strong>
              {lead.company ? ` · ${lead.company}` : ""}
            </p>
          )}
          <div className="space-y-1">
            <Label>To *</Label>
            <Input
              type="email"
              value={resolvedTo}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here…"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Clicking Open Email launches your default mail client. After you have
            actually sent the email, confirm below to mark this task complete.
          </p>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="outline"
            onClick={handleOpenEmail}
            disabled={!resolvedTo.trim()}
          >
            <Mail className="h-4 w-4 mr-1" />
            Open Email
          </Button>
          <Button
            onClick={handleConfirmSent}
            disabled={completeTask.isPending || !emailOpened}
          >
            {completeTask.isPending ? "Completing…" : "I've Sent It — Complete"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
