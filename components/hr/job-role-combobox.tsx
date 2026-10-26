"use client";

import { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { comboboxTriggerClassName } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { canManageJobRoles } from "@/lib/constants/roles";

export interface JobRole {
  id: number;
  title: string;
  departmentId: number | null;
  isActive: boolean | null;
  departmentName: string | null;
}

// Local query key — kept out of the shared lib/query-keys.ts on purpose.
const jobRolesKey = (departmentId?: number | null) =>
  ["miyoglobal", "hr", "jobRoles", departmentId ?? "none"] as const;

/**
 * `departmentId` scopes the catalog: a number gives that department plus
 * org-wide titles, null gives org-wide titles only, and undefined gives every
 * title in the org (A20).
 */
function useJobRoles(departmentId?: number | null) {
  return useQuery<JobRole[], Error>({
    queryKey: jobRolesKey(departmentId),
    queryFn: () =>
      apiClient.get<JobRole[]>("/hr/job-roles", {
        departmentId: departmentId == null ? "none" : String(departmentId),
      }),
    staleTime: 60_000,
  });
}

interface JobRoleComboboxProps {
  /** The currently selected job title (free text stored on the employee). */
  value: string;
  onValueChange: (title: string) => void;
  /** Department to scope the catalog by (also surfaces org-wide roles). */
  departmentId?: number | null;
  placeholder?: string;
  disabled?: boolean;
  /** Allow inline creation of a new catalog role (admins only). */
  allowCreate?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  /** From FormControl, so the field label names the combobox (FR1-014). */
  id?: string;
  "aria-describedby"?: string;
}

interface JobRoleOptionProps {
  role: JobRole;
  isSelected: boolean;
  onSelect: (title: string) => void;
}

const JobRoleOption = memo(function JobRoleOption({ role, isSelected, onSelect }: JobRoleOptionProps) {
  const handleClick = useCallback(() => onSelect(role.title), [onSelect, role.title]);
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
      )}
      onClick={handleClick}
    >
      <Check className={cn("size-4 shrink-0 text-brand-text", isSelected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
      <span className="truncate">{role.title}</span>
      {role.departmentId == null && (
        <span className="ml-auto shrink-0 text-2xs uppercase tracking-wide text-muted-foreground">
          Org-wide
        </span>
      )}
    </button>
  );
});

export function JobRoleCombobox({
  value,
  onValueChange,
  departmentId,
  placeholder = "Select or add job title",
  disabled = false,
  allowCreate = true,
  className,
  "aria-invalid": ariaInvalid,
  id,
  "aria-describedby": ariaDescribedBy,
}: JobRoleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: roles = [] } = useJobRoles(departmentId);

  const createRole = useMutation<
    { success: boolean; id?: number },
    Error,
    { title: string; departmentId: number | null }
  >({
    mutationFn: (data) => apiClient.post("/hr/job-roles", data),
  });

  const filtered = useMemo(() => {
    const active = roles.filter((r) => r.isActive !== false);
    if (!search.trim()) return active;
    const q = search.trim().toLowerCase();
    return active.filter((r) => r.title.toLowerCase().includes(q));
  }, [roles, search]);

  // R3-INV-05: a new org starts with no titles; say so instead of a bare "not found".
  const catalogEmpty = !roles.some((r) => r.isActive !== false);

  const exactMatch = useMemo(
    () => roles.some((r) => r.title.toLowerCase() === search.trim().toLowerCase()),
    [roles, search],
  );

  // R3-HR-05: same permission as /settings/job-roles; the API enforces it too.
  const actorRole = useSession().data?.user?.role;
  const mayCreate = allowCreate && canManageJobRoles(actorRole);
  const canAdd = mayCreate && search.trim().length >= 2 && !exactMatch && !createRole.isPending;

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = useCallback(
    (title: string) => {
      onValueChange(title);
      setOpen(false);
    },
    [onValueChange],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  const handleAdd = useCallback(() => {
    const title = search.trim();
    if (title.length < 2) return;
    // Scope a new role to the chosen department when present, else org-wide.
    createRole.mutate(
      { title, departmentId: departmentId ?? null },
      {
        onSuccess: async () => {
          await qc.invalidateQueries({ queryKey: ["miyoglobal", "hr", "jobRoles"] });
          onValueChange(title);
          setOpen(false);
          setSearch("");
          toast.success(`Job role "${title}" added`);
        },
        onError: (err) => {
          // On a duplicate (409) just adopt the typed value as free text.
          if (/already exists/i.test(err.message)) {
            onValueChange(title);
            setOpen(false);
            setSearch("");
            return;
          }
          toast.error(err.message || "Failed to add job role");
        },
      },
    );
  }, [search, departmentId, createRole, qc, onValueChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            comboboxTriggerClassName,
            !value && "text-subtle-foreground",
            className,
          )}
        >
          <span className="truncate text-left">{value || placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0" align="start">
        <div className="flex flex-col gap-1 border-b border-border p-2">
          <Input
            ref={inputRef}
            placeholder={mayCreate ? "Search or add job title..." : "Search job titles..."}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="h-9"
          />
        </div>
        <ScrollArea className="max-h-[240px]">
          <div className="p-1">
            {filtered.map((role) => (
              <JobRoleOption
                key={role.id}
                role={role}
                isSelected={value.toLowerCase() === role.title.toLowerCase()}
                onSelect={handleSelect}
              />
            ))}
            {canAdd && (
              <button
                type="button"
                className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                onClick={handleAdd}
              >
                <Plus className="size-4 shrink-0 text-brand-text" aria-hidden="true" />
                <span className="truncate">Add &quot;{search.trim()}&quot;</span>
              </button>
            )}
            {filtered.length === 0 && !canAdd && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {search.trim().length === 1
                  ? "Type at least 2 characters."
                  : catalogEmpty
                    ? mayCreate
                      ? "No job titles in the catalog yet. Type a title above to add the first one; it is saved for everyone."
                      : "No job titles in the catalog yet. Ask an Admin to add them in Settings > Job Roles."
                  : mayCreate
                    ? "No job role found. Type to search or add a new one."
                    : "No job role found. Ask an Admin to add this title in Settings > Job Roles."}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
