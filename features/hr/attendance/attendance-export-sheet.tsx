"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr/employees";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Employee } from "@/types/hr";
import {
  ExportMailFields,
  formatExportEmployeeLabel,
  useExportMailPeople,
  useExportMailRecipients,
} from "@/components/hr/export-mail-form";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceExportSheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"download" | "email">("download");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  const { people, hrEmails, ceoEmails } = useExportMailPeople();
  const mail = useExportMailRecipients();

  const { data: employeesData } = useHrEmployees(undefined);
  const { data: departments = [] } = useHrDepartments();

  const employees = useMemo<Employee[]>(
    () => (Array.isArray(employeesData) ? employeesData : []),
    [employeesData],
  );

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: formatExportEmployeeLabel(e),
      })),
    [employees],
  );

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [departments],
  );

  const buildBody = useCallback(() => {
    const body: Record<string, unknown> = { startDate, endDate };
    if (userIds.length) body.userIds = userIds;
    if (departmentIds.length) body.departmentIds = departmentIds.map(Number);
    return body;
  }, [startDate, endDate, userIds, departmentIds]);

  const validateRange = useCallback(() => {
    if (!startDate || !endDate) {
      toast.error("Pick a start and end date");
      return false;
    }
    if (startDate > endDate) {
      toast.error("Start date must be on or before end date");
      return false;
    }
    return true;
  }, [startDate, endDate]);

  const resetState = useCallback(() => {
    setTab("download");
    setUserIds([]);
    setDepartmentIds([]);
    setStartDate(firstOfMonth());
    setEndDate(today());
    mail.reset();
  }, [mail]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) resetState();
  };

  const handleDownload = async () => {
    if (!validateRange()) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/hr/attendance/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      const count = res.headers.get("X-Attendance-Export-Count");
      toast.success("Attendance exported", {
        description: `${count ?? "?"} record(s) downloaded`,
      });
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!validateRange()) return;
    const recipientError = mail.validateRecipients();
    if (recipientError) {
      toast.error(recipientError);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/hr/attendance/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...buildBody(),
          to: mail.to,
          cc: mail.cc.length ? mail.cc : undefined,
          bcc: mail.bcc.length ? mail.bcc : undefined,
          subject: mail.subject.trim() || undefined,
          message: mail.message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to send");
      }
      const payload = data as { sentTo?: number; records?: number; warnings?: string[] };
      toast.success("Attendance report sent", {
        description: `XLSX attached · ${payload.records ?? 0} record(s)${
          payload.warnings?.length ? ` · ${payload.warnings.join(" ")}` : ""
        }`,
      });
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const subjectPlaceholder = `Default: Attendance report – ${startDate} to ${endDate}`;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <DownloadIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Export attendance</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Export attendance</SheetTitle>
          <SheetDescription>
            Filter by employee, department, and date range, then download an Excel file or email it to
            specific recipients.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-1 flex-col gap-4 px-1 pb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Employees</Label>
              <SearchableMultiSelect
                options={employeeOptions}
                values={userIds}
                onValuesChange={setUserIds}
                placeholder="All employees"
                searchPlaceholder="Search employee…"
                emptyText="No employee found."
                selectedLabel={(count) => `${count} employees`}
                triggerClassName="h-9 font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Departments</Label>
              <SearchableMultiSelect
                options={departmentOptions}
                values={departmentIds}
                onValuesChange={setDepartmentIds}
                placeholder="All departments"
                searchPlaceholder="Search department…"
                emptyText="No department found."
                selectedLabel={(count) => `${count} departments`}
                triggerClassName="h-9 font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input className="h-9" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input className="h-9" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "download" | "email")} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="gap-1.5">
                <DownloadIcon className="h-3.5 w-3.5" />
                Download Excel
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5">
                <MailIcon className="h-3.5 w-3.5" />
                Send mail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Builds an .xlsx with a detailed log plus a per-employee summary for the selected filters.
              </p>
              <Button className="w-full gap-2" onClick={() => void handleDownload()} disabled={downloading}>
                {downloading ? (
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <DownloadIcon className="h-4 w-4" />
                )}
                Download Excel
              </Button>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              <ExportMailFields
                people={people}
                hrEmails={hrEmails}
                ceoEmails={ceoEmails}
                to={mail.to}
                cc={mail.cc}
                bcc={mail.bcc}
                subject={mail.subject}
                message={mail.message}
                onToChange={mail.setTo}
                onCcChange={mail.setCc}
                onBccChange={mail.setBcc}
                onSubjectChange={mail.setSubject}
                onMessageChange={mail.setMessage}
                onAddToRecipients={mail.addToRecipients}
                subjectPlaceholder={subjectPlaceholder}
                sendLabel="Send email with Excel"
                sending={sending}
                onSend={() => void handleSendEmail()}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
