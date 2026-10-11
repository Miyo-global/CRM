"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import {
  Map, Plus, Pencil, Trash2, MapPin, Users, Building2, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useTerritories,
  useCreateTerritory,
  useUpdateTerritory,
  useDeleteTerritory,
  type Territory,
  type CreateTerritoryInput,
} from "@/lib/api/hooks/crm";


interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function TagInput({ label, tags, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInputValue("");
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        onChange(tags.slice(0, -1));
      }
    },
    [inputValue, addTag, tags, onChange]
  );

  const removeTag = useCallback(
    (idx: number) => {
      onChange(tags.filter((_, i) => i !== idx));
    },
    [tags, onChange]
  );

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div
        className="flex min-h-9 cursor-text flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 focus-within:focus-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, idx) => (
          <Badge
            key={idx}
            variant="secondary"
            className="pr-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(idx); }}
              className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-accent focus-visible:focus-ring"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-xs text-muted-foreground">Press Enter to add each item</p>
    </div>
  );
}


interface FormState {
  name: string;
  states: string[];
  cities: string[];
  description: string;
  isActive: boolean;
}

function emptyForm(): FormState {
  return { name: "", states: [], cities: [], description: "", isActive: true };
}

function fromTerritory(t: Territory): FormState {
  return {
    name: t.name,
    states: t.states ?? [],
    cities: t.cities ?? [],
    description: t.description ?? "",
    isActive: t.isActive,
  };
}


interface TerritoryCardProps {
  territory: Territory;
  onEdit: (t: Territory) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function TerritoryCard({ territory: t, onEdit, onDelete, isDeleting }: TerritoryCardProps) {
  const MAX_CITIES = 5;
  const visibleCities = (t.cities ?? []).slice(0, MAX_CITIES);
  const extraCities = (t.cities ?? []).length - MAX_CITIES;

  return (
    <Card className="transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <IconChip icon={Map} size="sm" tone={t.isActive ? "brand" : "neutral"} />
            <p className="truncate text-sm font-semibold text-foreground" title={t.name}>{t.name}</p>
          </div>
          <StatusPill tone={t.isActive ? "success" : "neutral"} dot>
            {t.isActive ? "Active" : "Inactive"}
          </StatusPill>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5">
        {(t.states ?? []).length > 0 && (
          <div className="flex items-start gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {(t.states ?? []).join(", ")}
            </p>
          </div>
        )}

        {(t.cities ?? []).length > 0 && (
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {visibleCities.map((city) => (
                <Badge key={city} variant="outline">
                  {city}
                </Badge>
              ))}
              {extraCities > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  +{extraCities} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">{(t.assignedReps ?? []).length} assigned rep{(t.assignedReps ?? []).length !== 1 ? "s" : ""}</span>
        </div>

        {t.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(t)}
            aria-label={`Edit ${t.name}`}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-destructive hover:bg-danger-soft hover:text-destructive"
                loading={isDeleting}
                aria-label={`Delete ${t.name}`}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Territory</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{t.name}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(t.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}


export default function TerritoriesPage() {
  const { data: territories = [], isLoading, isError, error, refetch } = useTerritories();
  const { mutate: createTerritory, isPending: isCreating } = useCreateTerritory();
  const { mutate: updateTerritory, isPending: isUpdating } = useUpdateTerritory();
  const { mutate: deleteTerritory, variables: deletingVars } = useDeleteTerritory();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Territory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((t: Territory) => {
    setEditTarget(t);
    setForm(fromTerritory(t));
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const payload: CreateTerritoryInput = {
      name: form.name.trim(),
      states: form.states,
      cities: form.cities,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
    };

    if (editTarget) {
      updateTerritory(
        { id: editTarget.id, ...payload },
        { onSuccess: () => setSheetOpen(false) }
      );
    } else {
      createTerritory(payload, { onSuccess: () => setSheetOpen(false) });
    }
  }, [form, editTarget, createTerritory, updateTerritory]);

  const totalTerritories = territories.length;
  const activeTerritories = territories.filter((t) => t.isActive).length;
  const totalCities = territories.reduce((sum, t) => sum + (t.cities ?? []).length, 0);

  if (isLoading) {
    return (
      <PageWrapper
        title="Territory Management"
        subtitle="Define geographic territories and assign sales reps"
      >
        <div className="space-y-6">
          <Skeleton className="h-20 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Territory Management"
      subtitle="Define geographic territories and assign sales reps"
      actions={
        <Button size="sm" onClick={openCreate} aria-label="Create territory">
          <Plus className="size-4" />
          Add Territory
        </Button>
      }
    >
      {isError ? (
        <QueryErrorState title="Couldn't load territories" error={error} onRetry={() => refetch()} />
      ) : (
      <div className="space-y-6">
        <StatsStrip
          items={[
            { label: "Total Territories", value: totalTerritories, icon: Map, tone: "info" },
            { label: "Active Territories", value: activeTerritories, icon: CheckCircle2, tone: "success" },
            { label: "Cities Covered", value: totalCities, icon: MapPin, tone: "brand" },
          ]}
        />

        {territories.length === 0 ? (
          <EmptyState
            icon={Map}
            title="No territories yet"
            description="Create your first territory to start assigning sales reps to geographic regions."
            action={{ label: "Add Territory", onClick: openCreate }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {territories.map((t) => (
              <TerritoryCard
                key={t.id}
                territory={t}
                onEdit={openEdit}
                onDelete={(id) => deleteTerritory(id)}
                isDeleting={deletingVars === t.id}
              />
            ))}
          </div>
        )}
      </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent size="md" className="gap-0 p-0">
          <SheetHeader className="border-b px-6">
            <SheetTitle>{editTarget ? "Edit Territory" : "Create Territory"}</SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="territory-name">Name *</Label>
              <Input
                id="territory-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mumbai North"
              />
            </div>

            <TagInput
              label="States"
              tags={form.states}
              onChange={(states) => setForm((f) => ({ ...f, states }))}
              placeholder="Type a state and press Enter…"
            />

            <TagInput
              label="Cities"
              tags={form.cities}
              onChange={(cities) => setForm((f) => ({ ...f, cities }))}
              placeholder="Type a city and press Enter…"
            />

            <div className="space-y-1.5">
              <Label htmlFor="territory-description">Description</Label>
              <Textarea
                id="territory-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes about this territory…"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="territory-active">Active</Label>
              <Switch
                id="territory-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="ghost"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              loading={isCreating || isUpdating}
              disabled={!form.name.trim() || isCreating || isUpdating}
              onClick={handleSubmit}
            >
              {isCreating || isUpdating ? "Saving…" : editTarget ? "Save Changes" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
