"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateKbSpace,
  useUpdateKbSpace,
  type KbSpace,
} from "@/lib/api/hooks/knowledge";
import { toneDot } from "@/lib/design/tones";
import { cn } from "@/lib/utils";

import {
  KB_SPACE_AUDIENCES,
  KB_SPACE_COLORS,
  KB_SPACE_TYPE_LABELS,
  slugifySpaceName,
} from "../lib/space-meta";

/**
 * KB-0084: create or edit a space.
 *
 * The slug is suggested from the name but stays editable, because it ends up in
 * URLs people paste; once a space exists, changing it is the owner's call.
 */
export function SpaceSheet({
  space,
  open,
  onOpenChange,
}: {
  /** Omit to create. */
  space?: KbSpace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 overflow-y-auto">
        {/* Remounted per space and per opening, so the fields start from the
            space in hand without an effect copying props into state. */}
        {open ? (
          <SpaceSheetForm
            key={space?.id ?? "new"}
            space={space}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SpaceSheetForm({ space, onDone }: { space?: KbSpace; onDone: () => void }) {
  const [name, setName] = useState(space?.name ?? "");
  const [slug, setSlug] = useState(space?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!space);
  const [description, setDescription] = useState(space?.description ?? "");
  const [type, setType] = useState(space?.type ?? "team");
  const [audience, setAudience] = useState(space?.audience ?? "internal");
  const [color, setColor] = useState<string>(space?.color ?? KB_SPACE_COLORS[0]);
  const [defaultVisibility, setDefaultVisibility] = useState(space?.defaultVisibility ?? "org");

  const createSpace = useCreateKbSpace();
  const updateSpace = useUpdateKbSpace(space?.id ?? 0);

  const pending = createSpace.isPending || updateSpace.isPending;

  function submit() {
    const payload = {
      name: name.trim(),
      slug: (slugEdited ? slug : slugifySpaceName(name)).trim() || undefined,
      description: description.trim() || null,
      type,
      audience,
      color,
      defaultVisibility,
    };

    if (!payload.name) {
      toast.error("Name the space.");
      return;
    }

    const options = {
      onSuccess: () => {
        toast.success(space ? "Space updated" : "Space created");
        onDone();
      },
      onError: () => toast.error("Couldn't save the space."),
    };

    if (space) updateSpace.mutate(payload, options);
    else createSpace.mutate(payload, options);
  }

  return (
    <>
        <SheetHeader>
          <SheetTitle>{space ? "Edit space" : "New space"}</SheetTitle>
          <SheetDescription>
            A space groups pages and decides who sees them by default.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-slug">Slug</Label>
            <Input
              id="space-slug"
              value={slugEdited ? slug : slugifySpaceName(name)}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
              maxLength={60}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-description">Description</Label>
            <Textarea
              id="space-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KB_SPACE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KB_SPACE_AUDIENCES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Colour</Label>
            {/* The tone palette, not a colour picker: a space tinted with a
                stray hex stops matching the theme the moment it changes. */}
            <div className="flex flex-wrap gap-2">
              {KB_SPACE_COLORS.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  aria-label={tone}
                  aria-pressed={color === tone}
                  onClick={() => setColor(tone)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-colors",
                    color === tone ? "border-foreground" : "border-transparent",
                  )}
                >
                  <span className={cn("block h-full w-full rounded-full", toneDot[tone])} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>New pages are visible to</Label>
            <Select value={defaultVisibility} onValueChange={setDefaultVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Only me and people I add</SelectItem>
                <SelectItem value="space">Space members</SelectItem>
                <SelectItem value="org">Everyone at Miyo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {space ? "Save" : "Create space"}
          </Button>
        </SheetFooter>
    </>
  );
}
