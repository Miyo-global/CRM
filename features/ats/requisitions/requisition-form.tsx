"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_TYPES } from "@/lib/validations/ats-requisition";

export interface RequisitionOption {
  id: string;
  name: string;
}

export interface RequisitionFormValues {
  id?: number;
  title: string;
  departmentId?: number | null;
  location?: string | null;
  employmentType: string;
  openings: number;
  salaryMin?: string | null;
  salaryMax?: string | null;
  justification?: string | null;
  hiringManagerId?: string | null;
  approverId?: string | null;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

/** MIYO-0632: the hiring request form. Plain fields, no wizard. */
export function RequisitionForm({
  departments,
  people,
  initial,
}: {
  departments: { id: number; name: string }[];
  people: RequisitionOption[];
  initial?: RequisitionFormValues;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<RequisitionFormValues>(
    initial ?? { title: "", employmentType: "FULL_TIME", openings: 1 },
  );

  const set = <K extends keyof RequisitionFormValues>(key: K, value: RequisitionFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function save(thenSubmit: boolean) {
    setSaving(true);
    try {
      const editing = Boolean(initial?.id);
      const res = await fetch(
        editing ? `/api/ats/requisitions/${initial!.id}` : "/api/ats/requisitions",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            departmentId: values.departmentId ?? undefined,
            hiringManagerId: values.hiringManagerId ?? undefined,
            approverId: values.approverId ?? undefined,
            salaryMin: values.salaryMin || undefined,
            salaryMax: values.salaryMax || undefined,
            location: values.location || undefined,
            justification: values.justification || undefined,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Could not save the requisition.");
        return;
      }

      const id: number = body.id ?? initial?.id;
      if (thenSubmit) {
        const sent = await fetch(`/api/ats/requisitions/${id}/submit`, { method: "POST" });
        const sentBody = await sent.json();
        if (!sent.ok) {
          toast.error(sentBody?.error ?? "Saved, but could not send it for approval.");
        } else {
          toast.success(
            sentBody.emailSent
              ? "Sent to the approver."
              : "Submitted. The approval email did not go out.",
          );
        }
      } else {
        toast.success("Saved as a draft.");
      }
      router.push(`/ats/requisitions/${id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="grid max-w-2xl gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save(true);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Role title</Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="department">Department</Label>
          <Select
            value={values.departmentId ? String(values.departmentId) : undefined}
            onValueChange={(v) => set("departmentId", Number(v))}
          >
            <SelectTrigger id="department">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={values.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Hyderabad, or Remote"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="employmentType">Employment type</Label>
          <Select
            value={values.employmentType}
            onValueChange={(v) => set("employmentType", v)}
          >
            <SelectTrigger id="employmentType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {EMPLOYMENT_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="openings">Openings</Label>
          <Input
            id="openings"
            type="number"
            min={1}
            max={99}
            value={values.openings}
            onChange={(e) => set("openings", Number(e.target.value))}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="salaryMin">Monthly salary from (₹)</Label>
          <Input
            id="salaryMin"
            type="number"
            min={0}
            value={values.salaryMin ?? ""}
            onChange={(e) => set("salaryMin", e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="salaryMax">Monthly salary to (₹)</Label>
          <Input
            id="salaryMax"
            type="number"
            min={0}
            value={values.salaryMax ?? ""}
            onChange={(e) => set("salaryMax", e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="hiringManager">Hiring manager</Label>
          <Select
            value={values.hiringManagerId ?? undefined}
            onValueChange={(v) => set("hiringManagerId", v)}
          >
            <SelectTrigger id="hiringManager">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="approver">Approver</Label>
          <Select
            value={values.approverId ?? undefined}
            onValueChange={(v) => set("approverId", v)}
          >
            <SelectTrigger id="approver">
              <SelectValue placeholder="The CEO, unless you choose" />
            </SelectTrigger>
            <SelectContent>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="justification">Why this hire</Label>
        <Textarea
          id="justification"
          rows={4}
          value={values.justification ?? ""}
          onChange={(e) => set("justification", e.target.value)}
          placeholder="Workload, replacement, new project…"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          Submit for approval
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void save(false)}
        >
          Save draft
        </Button>
      </div>
    </form>
  );
}
