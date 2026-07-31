"use client";

import { useCallback } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { documentFolderNameSchema } from "@/lib/validations/hr-documents";

export interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  existingTabs: string[];
  onConfirm: (name: string) => void;
}

export function NewFolderDialog({
  open,
  onOpenChange,
  folderName,
  onFolderNameChange,
  existingTabs,
  onConfirm,
}: NewFolderDialogProps) {
  function handleCreate() {
    const parsed = documentFolderNameSchema.safeParse(folderName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid folder name");
      return;
    }
    const trimmed = parsed.data;
    if (existingTabs.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A folder with this name already exists");
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Folder
          </SheetTitle>
          <SheetDescription>
            Create a folder to organize your documents. Documents can be assigned to this folder
            by category or tag.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Onboarding, Compliance 2026..."
              value={folderName}
              onChange={(e) => onFolderNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onFolderNameChange("");
            }}
          >
            Cancel
          </Button>
          <Button disabled={!folderName.trim()} onClick={handleCreate}>
            Create Folder
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
