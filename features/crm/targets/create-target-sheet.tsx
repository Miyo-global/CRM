"use client";

import { useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { Check, Plus, Target } from "lucide-react";

interface Employee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  image?: string | null;
}

interface CreateTargetSheetProps {
  assignableEmployees: Employee[];
  isPending: boolean;
  onSubmit: (data: {
    userIds: string[];
    metricType: string;
    targetValue: string;
    period: string;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => void;
}

export function CreateTargetSheet({ assignableEmployees, isPending, onSubmit }: CreateTargetSheetProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [metricType, setMetricType] = useState("calls");
  const [period, setPeriod] = useState("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) { setSelectedUserIds([]); setStartDate(""); setEndDate(""); }
  }, []);

  const handleToggleUser = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const userId = e.currentTarget.dataset.userId;
    if (!userId) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      userIds: selectedUserIds,
      metricType,
      targetValue: formData.get("targetValue") as string,
      period,
      startDate,
      endDate,
      notes: (formData.get("notes") as string) || undefined,
    });
    setOpen(false);
    setSelectedUserIds([]);
    setStartDate("");
    setEndDate("");
  }, [selectedUserIds, metricType, period, startDate, endDate, onSubmit]);

  const employeeNames = useMemo(
    () =>
      new Map(
        assignableEmployees.map((emp) => [
          emp.id,
          emp.firstName ? `${emp.firstName} ${emp.lastName ?? ""}`.trim() : (emp.name ?? "Unknown"),
        ]),
      ),
    [assignableEmployees],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="bg-gold hover:bg-gold/90 text-white shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          Set Target
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 sm:max-w-[440px]">

        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gold/10 flex items-center justify-center">
              <Target className="h-4.5 w-4.5 text-gold" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">Set New Target</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Assign performance targets to team members</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <form id="create-target-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Assign To</Label>
                {selectedUserIds.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {selectedUserIds.length} selected
                  </Badge>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-1.5 space-y-0.5">
                {assignableEmployees.map((emp) => {
                  const empName = employeeNames.get(emp.id) ?? "Unknown";
                  const selected = selectedUserIds.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      data-user-id={emp.id}
                      onClick={handleToggleUser}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all text-left",
                        selected ? "bg-gold/10 ring-1 ring-gold/30" : "hover:bg-muted",
                      )}
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={resolveImageUrl(emp.image)} />
                        <AvatarFallback className="text-[10px] font-medium">{getInitials(empName)}</AvatarFallback>
                      </Avatar>
                      <span className={cn("flex-1 truncate", selected && "font-medium")}>{empName}</span>
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        selected ? "border-gold bg-gold" : "border-muted-foreground/30",
                      )}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
                {assignableEmployees.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No assignable team members</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Metric</Label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calls">Total Calls</SelectItem>
                  <SelectItem value="leads_converted">Leads Converted</SelectItem>
                  <SelectItem value="revenue">Revenue Generated</SelectItem>
                  <SelectItem value="meetings">Meetings Booked</SelectItem>
                  <SelectItem value="deals">Deals Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="targetValue" className="text-xs font-medium">Target Value</Label>
              <Input id="targetValue" name="targetValue" type="number" required placeholder="e.g. 10" className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Date</Label>
                <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date</Label>
                <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" fromDate={startDate ? new Date(startDate) : undefined} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add context or instructions..."
                rows={2}
                className="resize-none"
              />
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="px-6 py-3 border-t shrink-0">
          <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-target-form"
            className="flex-1 bg-gold hover:bg-gold/90 text-white h-9"
            disabled={isPending || selectedUserIds.length === 0}
          >
            {isPending ? "Creating..." : `Create Target${selectedUserIds.length > 1 ? "s" : ""}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
