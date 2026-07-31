"use client";

import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, FileText, XCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/storage/file-upload";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { HrSheet } from "@/features/hr/hr-sheet";

import { useCreateTermination, useTerminationReasons } from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { isCEO } from "@/lib/constants/roles";
import { OTHER_TERMINATION_REASON } from "@/lib/constants/hr-separation";

import { buildLetterPreview } from "./termination-utils";

interface CreateTerminationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  selectedUserId: string;
  setSelectedUserId: Dispatch<SetStateAction<string>>;
  selectedReasons: string[];
  setSelectedReasons: Dispatch<SetStateAction<string[]>>;
  explanation: string;
  setExplanation: Dispatch<SetStateAction<string>>;
  effectiveDate: string;
  setEffectiveDate: Dispatch<SetStateAction<string>>;
  noticePeriodWaived: boolean;
  setNoticePeriodWaived: Dispatch<SetStateAction<boolean>>;
  severanceAmount: string;
  setSeveranceAmount: Dispatch<SetStateAction<string>>;
  internalNotes: string;
  setInternalNotes: Dispatch<SetStateAction<string>>;
  onReset: () => void;
}

export function CreateTerminationSheet({
  open,
  onOpenChange,
  employees,
  selectedUserId,
  setSelectedUserId,
  selectedReasons,
  setSelectedReasons,
  explanation,
  setExplanation,
  effectiveDate,
  setEffectiveDate,
  noticePeriodWaived,
  setNoticePeriodWaived,
  severanceAmount,
  setSeveranceAmount,
  internalNotes,
  setInternalNotes,
  onReset,
}: CreateTerminationSheetProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const createTermination = useCreateTermination();
  const { data: reasonsData } = useTerminationReasons();
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);

  const terminableEmployees = useMemo(
    () =>
      employees.filter(
        (emp) => !isCEO(emp.role) && emp.id !== currentUserId,
      ),
    [employees, currentUserId],
  );

  const selectedEmployee = useMemo(
    () => terminableEmployees.find((e) => e.id === selectedUserId) ?? null,
    [terminableEmployees, selectedUserId],
  );

  const activeReasons = useMemo(() => {
    const labels = (reasonsData ?? [])
      .filter((r) => r.isActive)
      .map((r) => r.label);
    if (!labels.includes(OTHER_TERMINATION_REASON)) {
      labels.push(OTHER_TERMINATION_REASON);
    }
    return labels;
  }, [reasonsData]);

  const isOtherSelected = selectedReasons.includes(OTHER_TERMINATION_REASON);

  const handleEvidenceUpload = useCallback((url: string) => {
    setEvidenceUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }, []);

  const handleRemoveEvidence = useCallback((url: string) => {
    setEvidenceUrls((prev) => prev.filter((u) => u !== url));
  }, []);

  const handleSelectEmployee = useCallback(
    (id: string) => {
      setSelectedUserId(id);
      setEmployeePickerOpen(false);
    },
    [setSelectedUserId]
  );

  const letterPreview = useMemo(
    () =>
      buildLetterPreview({
        employeeName: selectedEmployee?.name ?? "",
        designation: selectedEmployee?.designation ?? "",
        effectiveDate,
        reasons: selectedReasons,
        explanation,
        noticePeriodWaived,
        severanceAmount,
      }),
    [selectedEmployee, effectiveDate, selectedReasons, explanation, noticePeriodWaived, severanceAmount]
  );

  const handleToggleReason = useCallback((reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  }, [setSelectedReasons]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setEvidenceUrls([]);
        onReset();
      }
    },
    [onOpenChange, onReset]
  );

  const handleExplanationChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setExplanation(e.target.value),
    [setExplanation]
  );

  const handleEffectiveDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEffectiveDate(e.target.value),
    [setEffectiveDate]
  );

  const handleSeveranceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSeveranceAmount(e.target.value),
    [setSeveranceAmount]
  );

  const handleInternalNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setInternalNotes(e.target.value),
    [setInternalNotes]
  );

  const handleCreateSubmit = useCallback(() => {
    if (!selectedUserId) {
      toast.error("Please select an employee");
      return;
    }
    if (isCEO(selectedEmployee?.role)) {
      toast.error("The CEO cannot be terminated through this process.");
      return;
    }
    if (selectedUserId === currentUserId) {
      toast.error("You cannot initiate your own termination.");
      return;
    }
    if (selectedReasons.length === 0) {
      toast.error("Please select at least one termination reason");
      return;
    }
    if (explanation.trim().length < 50) {
      toast.error(
        isOtherSelected
          ? "Selecting 'Other' requires a detailed explanation (min 50 characters)"
          : "Detailed explanation must be at least 50 characters"
      );
      return;
    }
    if (!effectiveDate) {
      toast.error("Please set an effective date");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${effectiveDate}T00:00:00`) < today) {
      toast.error("Effective date can't be in the past");
      return;
    }
    if (severanceAmount && (!Number.isFinite(Number(severanceAmount)) || Number(severanceAmount) < 0)) {
      toast.error("Severance amount must be a valid non-negative number");
      return;
    }

    createTermination.mutate(
      {
        userId: selectedUserId,
        reasons: selectedReasons,
        detailedExplanation: explanation.trim(),
        effectiveDate,
        severanceAmount: severanceAmount ? Number(severanceAmount) : undefined,
        noticePeriodWaived,
        internalNotes: internalNotes.trim() || undefined,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Termination saved as draft");
          onOpenChange(false);
          setEvidenceUrls([]);
          onReset();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    selectedUserId,
    selectedReasons,
    explanation,
    effectiveDate,
    severanceAmount,
    noticePeriodWaived,
    internalNotes,
    evidenceUrls,
    isOtherSelected,
    createTermination,
    onOpenChange,
    onReset,
  ]);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title="New Termination"
      description="Create a termination record. It will be saved as a draft."
      onSubmit={handleCreateSubmit}
      submitLabel="Save as Draft"
      isPending={createTermination.isPending}
    >
      {/* Employee select */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Employee <span className="text-destructive">*</span>
        </Label>
        <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={employeePickerOpen}
              aria-label="Select employee"
              className={cn(
                "w-full justify-between font-normal",
                !selectedEmployee && "text-muted-foreground"
              )}
            >
              <span className="truncate">
                {selectedEmployee ? (selectedEmployee.name ?? "Unnamed") : "Select an employee..."}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search by name or designation…" className="h-9" />
              <CommandList>
                <CommandEmpty>No employee found.</CommandEmpty>
                <CommandGroup>
                  {terminableEmployees.map((emp) => (
                    <CommandItem
                      key={emp.id}
                      value={`${emp.name ?? "Unnamed"} ${emp.designation ?? ""} ${emp.id}`}
                      onSelect={() => handleSelectEmployee(emp.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selectedUserId === emp.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex flex-col">
                        <span>{emp.name ?? "Unnamed"}</span>
                        {emp.designation && (
                          <span className="text-xs text-muted-foreground">
                            {emp.designation}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {/* Termination Reasons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Termination Reasons <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {activeReasons.map((reason) => (
            <div key={reason} className="flex items-center gap-2">
              <Checkbox
                id={`reason-${reason}`}
                checked={selectedReasons.includes(reason)}
                onCheckedChange={() => handleToggleReason(reason)}
                aria-label={reason}
              />
              <Label
                htmlFor={`reason-${reason}`}
                className="text-xs font-normal cursor-pointer"
              >
                {reason}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Detailed explanation */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Detailed Explanation <span className="text-destructive">*</span>
        </Label>
        {isOtherSelected && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            You selected &quot;Other&quot; — a detailed explanation is required.
          </p>
        )}
        <Textarea
          placeholder="Minimum 50 characters. Describe the reasons and circumstances in detail..."
          value={explanation}
          onChange={handleExplanationChange}
          rows={4}
          aria-label="Detailed explanation"
        />
        <p className="text-[11px] text-muted-foreground">
          {explanation.length} / 50 min characters
        </p>
      </div>

      {/* Effective date */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Effective Date <span className="text-destructive">*</span>
        </Label>
        <Input
          type="date"
          value={effectiveDate}
          onChange={handleEffectiveDateChange}
          aria-label="Effective date"
        />
      </div>

      <Separator />

      {/* Notice period waived */}
      <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Notice Period Waived</p>
          <p className="text-xs text-muted-foreground">
            Employee will not be required to serve notice period.
          </p>
        </div>
        <Switch
          checked={noticePeriodWaived}
          onCheckedChange={setNoticePeriodWaived}
          aria-label="Notice period waived"
        />
      </div>

      {/* Severance amount */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Severance Amount{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₹
          </span>
          <Input
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            value={severanceAmount}
            onChange={handleSeveranceChange}
            className="pl-6"
            aria-label="Severance amount"
          />
        </div>
      </div>

      {/* Internal notes */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Internal Notes{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Notes visible only to HR and management..."
          value={internalNotes}
          onChange={handleInternalNotesChange}
          rows={3}
          aria-label="Internal notes"
        />
      </div>

      <Separator />

      {/* Supporting evidence */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Supporting Evidence{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Attach warning letters, performance reviews, incident reports or other
          documents supporting this termination.
        </p>
        <FileUpload
          folder="documents"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onUploadComplete={handleEvidenceUpload}
        />
        {evidenceUrls.length > 0 && (
          <ul className="space-y-1.5">
            {evidenceUrls.map((url, idx) => (
              <li
                key={url}
                className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 min-w-0 text-xs text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Evidence {idx + 1}</span>
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveEvidence(url)}
                  aria-label={`Remove evidence ${idx + 1}`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      {/* Letter preview */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Letter Preview</Label>
        <Textarea
          readOnly
          value={letterPreview}
          rows={12}
          className="font-mono text-[11px] bg-muted/40 resize-none"
          aria-label="Termination letter preview"
        />
        <p className="text-[11px] text-muted-foreground">
          Auto-generated preview based on the fields above. The final letter will
          be generated upon email send.
        </p>
      </div>
    </HrSheet>
  );
}
