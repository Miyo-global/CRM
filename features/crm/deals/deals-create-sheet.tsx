"use client";

import { memo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { CreateDealForm } from "@/features/crm/deals/create-deal-form";

interface DealsCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; name: string | null }>;
  onSuccess: () => void;
}

export const DealsCreateSheet = memo(function DealsCreateSheet({
  open,
  onOpenChange,
  employees,
  onSuccess,
}: DealsCreateSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Create New Deal</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <CreateDealForm employees={employees} onSuccess={onSuccess} />
        </div>
      </SheetContent>
    </Sheet>
  );
});
