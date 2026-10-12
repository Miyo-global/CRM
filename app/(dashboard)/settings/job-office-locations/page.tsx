"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, ArrowLeft, MapPin } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrgSettings, useUpdateOrgSettings } from "@/lib/api/hooks/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import type { JobOfficeLocation } from "@/types/organization";
import { COUNTRY_OPTIONS } from "@/lib/validations/job-opening";

const EMPTY_FORM: JobOfficeLocation = { name: "", city: "", state: "", country: "" };

function dedupeLocations(locations: JobOfficeLocation[]): JobOfficeLocation[] {
  const seen = new Set<string>();
  const out: JobOfficeLocation[] = [];
  for (const loc of locations) {
    const k = loc.name.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({ ...loc, name: loc.name.trim(), city: loc.city.trim(), state: loc.state.trim(), country: loc.country.trim() });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export default function JobOfficeLocationsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "ADMIN"]}>
      <JobOfficeLocationsContent />
    </DashboardGate>
  );
}

function JobOfficeLocationsContent() {
  const { data: org, isLoading } = useOrgSettings();
  const updateMutation = useUpdateOrgSettings();
  const [draft, setDraft] = useState<JobOfficeLocation[]>([]);
  const [form, setForm] = useState<JobOfficeLocation>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobOfficeLocation, string>>>({});

  const remoteSig = useMemo(
    () => JSON.stringify(dedupeLocations(org?.jobOfficeLocations ?? [])),
    [org?.jobOfficeLocations],
  );

  useEffect(() => {
    if (!org) return;
    setDraft(dedupeLocations(org.jobOfficeLocations ?? []));
  }, [org?.id, remoteSig]);

  const dirty = useMemo(() => {
    return JSON.stringify(dedupeLocations(draft)) !== remoteSig;
  }, [draft, remoteSig]);

  const validate = useCallback((f: JobOfficeLocation) => {
    const errs: Partial<Record<keyof JobOfficeLocation, string>> = {};
    if (!f.name.trim()) errs.name = "Name is required";
    else if (f.name.trim().length > 200) errs.name = "Max 200 characters";
    if (!f.city.trim()) errs.city = "City is required";
    else if (f.city.trim().length > 100) errs.city = "Max 100 characters";
    if (!f.state.trim()) errs.state = "State / Region is required";
    else if (f.state.trim().length > 100) errs.state = "Max 100 characters";
    if (!f.country.trim()) errs.country = "Country is required";
    return errs;
  }, []);

  const addLocation = useCallback(() => {
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }
    const key = form.name.trim().toLowerCase();
    if (draft.some((d) => d.name.trim().toLowerCase() === key)) {
      toast.error("A location with this name already exists");
      return;
    }
    setDraft((d) => dedupeLocations([...d, form]));
    setForm(EMPTY_FORM);
    setFormErrors({});
  }, [form, draft, validate]);

  const remove = useCallback((name: string) => {
    setDraft((d) => d.filter((x) => x.name !== name));
  }, []);

  const save = useCallback(async () => {
    const normalized = dedupeLocations(draft);
    if (normalized.length > 100) {
      toast.error("At most 100 office locations");
      return;
    }
    try {
      await updateMutation.mutateAsync({ jobOfficeLocations: normalized });
      toast.success("Office locations saved");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [draft, updateMutation]);

  return (
    <PageWrapper
      title="Job office locations"
      subtitle="Presets used when creating job openings — selecting one auto-fills city, state and country."
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/organization">
            <ArrowLeft aria-hidden />
            Back
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Add location</CardTitle>
            <CardDescription>
              Fill in all fields. Choosing a location on the{" "}
              <Link href="/hr/recruitment/jobs/new" className="text-brand-text underline underline-offset-2">
                new job opening
              </Link>{" "}
              form will auto-fill city, state and country.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="loc-name">Office name *</Label>
                    <Input
                      id="loc-name"
                      placeholder="e.g. Head Office Bengaluru"
                      maxLength={200}
                      value={form.name}
                      onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErrors((fe) => ({ ...fe, name: undefined })); }}
                    />
                    {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loc-country">Country *</Label>
                    <Select
                      value={form.country}
                      onValueChange={(v) => { setForm((f) => ({ ...f, country: v })); setFormErrors((fe) => ({ ...fe, country: undefined })); }}
                    >
                      <SelectTrigger id="loc-country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.country && <p className="text-xs text-destructive">{formErrors.country}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loc-state">State / Region *</Label>
                    <Input
                      id="loc-state"
                      placeholder="e.g. Karnataka"
                      maxLength={100}
                      value={form.state}
                      onChange={(e) => { setForm((f) => ({ ...f, state: e.target.value })); setFormErrors((fe) => ({ ...fe, state: undefined })); }}
                    />
                    {formErrors.state && <p className="text-xs text-destructive">{formErrors.state}</p>}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="loc-city">City *</Label>
                    <Input
                      id="loc-city"
                      placeholder="e.g. Bengaluru"
                      maxLength={100}
                      value={form.city}
                      onChange={(e) => { setForm((f) => ({ ...f, city: e.target.value })); setFormErrors((fe) => ({ ...fe, city: undefined })); }}
                    />
                    {formErrors.city && <p className="text-xs text-destructive">{formErrors.city}</p>}
                  </div>
                </div>
                <Button type="button" variant="secondary" onClick={addLocation}>
                  Add location
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!isLoading && draft.length === 0 && (
          <EmptyState
            compact
            icon={MapPin}
            title="No office locations yet"
            description="Add a location above to use it as a preset on job openings."
          />
        )}

        {draft.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Saved locations</h2>
              <span className="inline-flex h-5 items-center rounded-full bg-neutral-soft px-2 text-2xs font-semibold tabular-nums text-neutral-strong">
                {draft.length}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.map((loc) => (
                  <TableRow key={loc.name} className="group">
                    <TableCell className="max-w-56 truncate font-medium" title={loc.name}>{loc.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[loc.city, loc.state, loc.country].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${loc.name}`}
                        onClick={() => remove(loc.name)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {draft.length > 0 && (
          <div className="sticky bottom-0 z-sticky -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8">
            {dirty && <span className="mr-auto text-xs text-warning-strong">Unsaved changes</span>}
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty || updateMutation.isPending}
              onClick={() => setDraft(dedupeLocations(org?.jobOfficeLocations ?? []))}
            >
              Discard
            </Button>
            <Button type="button" onClick={save} disabled={!dirty || updateMutation.isPending} loading={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
