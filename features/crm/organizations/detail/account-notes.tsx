"use client";

import { useState, useCallback, useEffect } from "react";
import { Pencil, Save, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCrmOrganization } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

interface AccountNotesProps {
  organizationId: number;
  initialNotes: string | null;
}

export function AccountNotes({ organizationId, initialNotes }: AccountNotesProps) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");

  useEffect(() => {
    if (!editing) setNotes(initialNotes ?? "");
  }, [initialNotes, organizationId, editing]);

  const updateMutation = useUpdateCrmOrganization();

  const handleSave = useCallback(() => {
    updateMutation.mutate(
      { id: organizationId, notes: notes || null },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          setEditing(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }, [organizationId, notes, updateMutation]);

  const handleCancel = useCallback(() => {
    setNotes(initialNotes ?? "");
    setEditing(false);
  }, [initialNotes]);

  if (!editing) {
    return (
      <div className="space-y-2">
        {notes ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileText className="h-7 w-7 text-muted-foreground/40 mb-1.5" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
          {notes ? "Edit notes" : "Add notes"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add internal notes about this organization..."
        rows={5}
        className="resize-none text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1.5 bg-gold hover:bg-gold/90 text-white"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Save className="h-3 w-3" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
