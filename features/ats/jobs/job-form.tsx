"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { WORK_MODES } from "@/lib/validations/ats-job";

export interface JobFormValues {
  id?: number;
  title: string;
  requisitionId?: number | null;
  departmentId?: number | null;
  workMode: string;
  location?: string | null;
  employmentType: string;
  openings: number;
  description: string;
  requirements?: string | null;
  salaryMin?: string | null;
  salaryMax?: string | null;
  salaryVisible: boolean;
  closesAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  hiringTeam: string[];
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

const WORK_MODE_LABELS: Record<string, string> = {
  ONSITE: "On site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const EMPTY_JOB: JobFormValues = {
  title: "",
  workMode: "ONSITE",
  employmentType: "FULL_TIME",
  openings: 1,
  description: "",
  salaryVisible: false,
  hiringTeam: [],
};

/**
 * MIYO-0633: the job form, used for both new and edit. Everyone on the
 * hiring team is an interviewer until someone changes it on the job page.
 */
export function JobForm({
  departments,
  people,
  initial,
}: {
  departments: { id: number; name: string }[];
  people: { id: string; name: string }[];
  initial?: JobFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>(initial ?? EMPTY_JOB);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function save() {
    setSaving(true);
    try {
      const editing = Boolean(initial?.id);
      const res = await fetch(editing ? `/api/ats/jobs/${initial!.id}` : "/api/ats/jobs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          requisitionId: values.requisitionId ?? undefined,
          departmentId: values.departmentId ?? undefined,
          location: values.location || undefined,
          requirements: values.requirements || undefined,
          salaryMin: values.salaryMin || undefined,
          salaryMax: values.salaryMax || undefined,
          closesAt: values.closesAt || undefined,
          seoTitle: values.seoTitle || undefined,
          seoDescription: values.seoDescription || undefined,
          hiringTeam: values.hiringTeam.map((userId) => ({ userId, role: "INTERVIEWER" })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? "Could not save the job.");
        return;
      }
      toast.success(editing ? "Job saved." : "Job saved as a draft.");
      router.push(`/ats/jobs/${body.id ?? initial?.id}/edit`);
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
        void save();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Job title</Label>
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
          <Label htmlFor="workMode">Work mode</Label>
          <Select value={values.workMode} onValueChange={(v) => set("workMode", v)}>
            <SelectTrigger id="workMode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORK_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {WORK_MODE_LABELS[m]}
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
            placeholder="Hyderabad, Telangana"
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
              {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
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
          <Label htmlFor="closesAt">Closing date</Label>
          <Input
            id="closesAt"
            type="date"
            value={values.closesAt ?? ""}
            onChange={(e) => set("closesAt", e.target.value)}
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
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={values.salaryVisible}
          onCheckedChange={(checked) => set("salaryVisible", checked === true)}
        />
        Show the salary range on the careers site
      </label>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={10}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Basic HTML is kept; anything else is stripped when it is saved.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          rows={6}
          value={values.requirements ?? ""}
          onChange={(e) => set("requirements", e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Hiring team</Label>
        <SearchableMultiSelect
          options={people.map((p) => ({ value: p.id, label: p.name }))}
          values={values.hiringTeam}
          onValuesChange={(selected) => set("hiringTeam", selected)}
          placeholder="Add the people who will interview"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="seoTitle">Search title</Label>
          <Input
            id="seoTitle"
            maxLength={70}
            value={values.seoTitle ?? ""}
            onChange={(e) => set("seoTitle", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="seoDescription">Search description</Label>
          <Input
            id="seoDescription"
            maxLength={160}
            value={values.seoDescription ?? ""}
            onChange={(e) => set("seoDescription", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={saving}>
          Save job
        </Button>
      </div>
    </form>
  );
}
