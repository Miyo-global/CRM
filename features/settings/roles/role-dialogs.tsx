"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useCreateRole,
  useRoleTemplates,
  useCloneRoleTemplate,
  type RoleTemplate,
} from "@/lib/api/hooks/roles";


const ROLE_TEMPLATES: Array<{ label: string; name: string; slug: string; permissions: string[] }> = [
  {
    label: "Sales Rep",
    name: "Sales Rep",
    slug: "SALES_REP",
    permissions: [
      "crm:leads:view", "crm:leads:create", "crm:leads:update",
      "crm:targets:view", "dashboard:sales:view", "self:view",
    ],
  },
  {
    label: "HR Admin",
    name: "HR Admin",
    slug: "HR_ADMIN",
    permissions: [
      "hr:employees:view", "hr:employees:create", "hr:employees:update",
      "hr:leaves:view", "hr:leaves:manage", "hr:attendance:view", "hr:attendance:manage",
      "hr:payroll:view", "hr:payroll:manage", "settings:rbac:view",
    ],
  },
  {
    label: "Project Manager",
    name: "Project Manager",
    slug: "PROJECT_MANAGER",
    permissions: [
      "projects:view", "projects:create", "projects:update",
      "projects:tickets:view", "projects:tickets:create", "projects:tickets:update",
      "projects:sprints:view", "projects:sprints:create",
      "projects:timesheets:view", "projects:timesheets:manage",
    ],
  },
  {
    label: "Finance Manager",
    name: "Finance Manager",
    slug: "FINANCE_MANAGER",
    permissions: [
      "hr:payroll:view", "hr:payroll:manage",
      "hr:expenses:view", "hr:expenses:manage",
      "hr:salary:view", "reports:view",
    ],
  },
];


export function CreateRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const create = useCreateRole();

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setSlug(value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z_]/g, ""));
  }, []);

  const handleNameInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value), [handleNameChange]);
  const handleSlugInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value.toUpperCase().replace(/[^A-Z_]/g, "")), []);
  const handleCancelDialog = useCallback(() => { onOpenChange(false); setName(""); setSlug(""); setSelectedPermissions([]); }, [onOpenChange]);

  const handleTemplateSelect = useCallback((tmpl: typeof ROLE_TEMPLATES[number]) => {
    setName(tmpl.name);
    setSlug(tmpl.slug);
    setSelectedPermissions(tmpl.permissions);
  }, []);

  const handleCreate = useCallback(() => {
    create.mutate(
      { name, slug, permissions: selectedPermissions },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setSlug("");
          setSelectedPermissions([]);
          toast.success("Role created");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [create, name, slug, selectedPermissions, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>Start from a template or create a custom role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Start from a template</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.slug}
                  type="button"
                  onClick={() => handleTemplateSelect(tmpl)}
                  aria-pressed={slug === tmpl.slug}
                  className={cn(
                    "h-7 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:focus-ring",
                    slug === tmpl.slug
                      ? "border-primary bg-brand-soft text-brand-soft-foreground"
                      : "border-border text-muted-foreground hover:border-border-strong hover:bg-accent hover:text-foreground"
                  )}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm">Role Name</Label>
            <Input
              value={name}
              onChange={handleNameInputChange}
              placeholder="e.g. Finance Manager"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm">Slug (auto-generated)</Label>
            <Input
              value={slug}
              onChange={handleSlugInputChange}
              placeholder="FINANCE_MANAGER"
              className="mt-1 font-mono text-xs"
            />
          </div>
          {selectedPermissions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedPermissions.length} permissions pre-selected from template. You can edit them after creation.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleCancelDialog}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || create.isPending}
              loading={create.isPending}
            >
              Create Role
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export function RoleTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: templates, isLoading } = useRoleTemplates();
  const clone = useCloneRoleTemplate();

  function handleClone(template: RoleTemplate) {
    clone.mutate(
      { templateId: template.id },
      {
        onSuccess: () => {
          toast.success(`"${template.name}" role cloned`);
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message ?? "Failed to clone template"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Role Templates</DialogTitle>
          <DialogDescription>
            Clone a pre-built role to get started quickly. You can customize permissions after.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <span className="sr-only">Loading templates...</span>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            templates?.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="tabular-nums">{t.permissions.length}</span> permission{t.permissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={clone.isPending}
                  loading={clone.isPending && clone.variables?.templateId === t.id}
                  onClick={() => handleClone(t)}
                >
                  {!(clone.isPending && clone.variables?.templateId === t.id) && <Copy aria-hidden />} Clone
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
