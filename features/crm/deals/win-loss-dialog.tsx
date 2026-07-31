"use client";

import { memo, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WinLossDialogProps {
  dialog: { id: number; stage: "WON" | "LOST" } | null;
  category: string;
  notes: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WinLossDialog = memo(function WinLossDialog({
  dialog,
  category,
  notes,
  isPending,
  onOpenChange,
  onCategoryChange,
  onNotesChange,
  onConfirm,
  onCancel,
}: WinLossDialogProps) {
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onNotesChange(e.target.value),
    [onNotesChange],
  );

  return (
    <Sheet open={dialog !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {dialog?.stage === "WON" ? "Mark Deal as Won" : "Mark Deal as Lost"}
          </SheetTitle>
          <SheetDescription>
            {dialog?.stage === "WON"
              ? "Optionally record why this deal was won."
              : "Optionally record why this deal was lost."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="winloss-category">
              {dialog?.stage === "WON" ? "Win reason" : "Loss reason"}
            </Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger id="winloss-category">
                <SelectValue placeholder="Select a reason (optional)" />
              </SelectTrigger>
              <SelectContent>
                {dialog?.stage === "WON" ? (
                  <>
                    <SelectItem value="Best Product">Best Product</SelectItem>
                    <SelectItem value="Best Price">Best Price</SelectItem>
                    <SelectItem value="Best Support">Best Support</SelectItem>
                    <SelectItem value="Existing Relationship">Existing Relationship</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="Price Too High">Price Too High</SelectItem>
                    <SelectItem value="Chose Competitor">Chose Competitor</SelectItem>
                    <SelectItem value="No Budget">No Budget</SelectItem>
                    <SelectItem value="Poor Timing">Poor Timing</SelectItem>
                    <SelectItem value="Product Mismatch">Product Mismatch</SelectItem>
                    <SelectItem value="No Response">No Response</SelectItem>
                    <SelectItem value="Internal Decision">Internal Decision</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="winloss-notes">
              {dialog?.stage === "WON"
                ? "What was the deciding factor?"
                : "Why was the deal lost?"}
              <span className="ml-1 text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="winloss-notes"
              placeholder="Add any additional notes..."
              rows={3}
              value={notes}
              onChange={handleNotesChange}
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className={cn(
              "flex-1",
              dialog?.stage === "WON"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-destructive hover:bg-destructive/90 text-white",
            )}
            onClick={onConfirm}
            disabled={isPending}
          >
            Confirm
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
