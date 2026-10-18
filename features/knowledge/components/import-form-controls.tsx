"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useKbSpaces } from "@/lib/api/hooks/knowledge";

/** KB-0088: where imported pages land, and what happens to repeats. */
export function ImportFormControls({
  spaceId,
  visibility,
  duplicatePolicy,
  onSpaceChange,
  onVisibilityChange,
  onDuplicatePolicyChange,
}: {
  spaceId: string;
  visibility: string;
  duplicatePolicy: string;
  onSpaceChange: (spaceId: string) => void;
  onVisibilityChange: (visibility: string) => void;
  onDuplicatePolicyChange: (policy: string) => void;
}) {
  const spaces = useKbSpaces();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label>Space</Label>
        <SearchableSelect
          value={spaceId}
          onValueChange={onSpaceChange}
          options={(spaces.data?.items ?? []).map((space) => ({
            value: String(space.id),
            label: space.name,
          }))}
          placeholder="No space"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Visible to</Label>
        <Select value={visibility} onValueChange={onVisibilityChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Only me and people I add</SelectItem>
            <SelectItem value="org">Everyone at Miyo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>If a page is already there</Label>
        <Select value={duplicatePolicy} onValueChange={onDuplicatePolicyChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">Leave it alone</SelectItem>
            <SelectItem value="update">Replace its content</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
