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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useCreateRole,
  useRoleTemplates,
  useCloneRoleTemplate,
  type RoleTemplate,
} from "@/lib/api/hooks/roles";


function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}


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
    label: "Recruiter",
    name: "Recruiter",
    slug: "RECRUITER",
    permissions: [
      "hr:employees:view",
      "hr:documents:view", "hr:documents:create",
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription className="text-xs">Start from a template or create a custom role.</DialogDescription>
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
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    slug === tmpl.slug
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary hover:text-primary"
                  )}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Role Name</Label>
            <Input
              value={name}
              onChange={handleNameInputChange}
              placeholder="e.g. Finance Manager"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Slug (auto-generated)</Label>
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
            <Button variant="outline" onClick={handleCancelDialog}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || create.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {create.isPending && <SpinnerIcon className="h-4 w-4 animate-spin mr-1" />}
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Role Templates</DialogTitle>
          <DialogDescription>
            Clone a pre-built role to get started quickly. You can customize permissions after.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading templates...</div>
          ) : (
            templates?.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.permissions.length} permission{t.permissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={clone.isPending}
                  onClick={() => handleClone(t)}
                >
                  <CopyIcon className="h-3.5 w-3.5 mr-1" /> Clone
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
