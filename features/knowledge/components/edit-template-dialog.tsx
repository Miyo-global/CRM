"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateKbTemplate,
  useUpdateKbTemplate,
  type KbTemplate,
} from "@/lib/api/hooks/knowledge";
import { markdownToPlate } from "@/components/editor/plate/plate-value-convert";

/**
 * KB-0085: create or edit an org template.
 *
 * The body is written as Markdown and converted on save: a second rich editor
 * inside a dialog is a lot of machinery for text that is mostly headings and
 * bullet points waiting to be filled in.
 */
export function EditTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template?: KbTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open ? (
          <EditTemplateForm
            key={template?.id ?? "new"}
            template={template}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditTemplateForm({
  template,
  onDone,
}: {
  template?: KbTemplate;
  onDone: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [body, setBody] = useState("");

  const createTemplate = useCreateKbTemplate();
  const updateTemplate = useUpdateKbTemplate(template?.id ?? 0);
  const pending = createTemplate.isPending || updateTemplate.isPending;

  function submit() {
    if (!name.trim()) {
      toast.error("Name the template.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      // An untouched body on an edit leaves the stored content alone.
      ...(body.trim() || !template ? { content: markdownToPlate(body) } : {}),
    };

    const options = {
      onSuccess: () => {
        toast.success(template ? "Template updated" : "Template created");
        onDone();
      },
      onError: () => toast.error("Couldn't save the template."),
    };

    if (template) updateTemplate.mutate(payload, options);
    else createTemplate.mutate(payload, options);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-name">Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-description">Description</Label>
          <Input
            id="template-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={300}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="template-body">Body</Label>
          <Textarea
            id="template-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={10}
            placeholder={"## Summary\n\n- \n\n## Next steps"}
          />
          <p className="text-xs text-muted-foreground">
            Markdown. Headings and bullets come through; leave it empty to keep the current body.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {template ? "Save" : "Create template"}
        </Button>
      </DialogFooter>
    </>
  );
}
