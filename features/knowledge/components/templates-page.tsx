"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateKbPage,
  useDeleteKbTemplate,
  useKbTemplates,
  type KbTemplate,
} from "@/lib/api/hooks/knowledge";
import { pageHref } from "@/lib/knowledge/routes";

import { EditTemplateDialog } from "./edit-template-dialog";
import { TemplateCard } from "./template-cards";
import { TemplatePreviewDialog } from "./template-preview-dialog";

/** KB-0085: the templates page — the starters, and the org's own. */
export function TemplatesPage({ canManage = false }: { canManage?: boolean }) {
  const router = useRouter();
  const templates = useKbTemplates();
  const createPage = useCreateKbPage();
  const deleteTemplate = useDeleteKbTemplate();

  const [editing, setEditing] = useState<KbTemplate | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [preview, setPreview] = useState<{ id: number; name: string } | null>(null);

  function use(input: { templateId?: number; starterKey?: string }) {
    createPage.mutate(input, {
      onSuccess: (page) => router.push(pageHref(page.id)),
      onError: () => toast.error("Couldn't start a page from that template."),
    });
  }

  const own = templates.data?.items ?? [];
  const starters = templates.data?.starters ?? [];

  return (
    <PageWrapper
      title="Templates"
      subtitle="Starting points for a new page"
      breadcrumbs={false}
      actions={
        canManage ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setEditOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New template
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue="starter">
        <TabsList>
          <TabsTrigger value="starter">Starter</TabsTrigger>
          <TabsTrigger value="org">Organisation</TabsTrigger>
        </TabsList>

        <TabsContent value="starter" className="mt-4">
          {templates.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {starters.map((starter) => (
                <TemplateCard
                  key={starter.key}
                  name={starter.name}
                  description={starter.description}
                  category={starter.category}
                  onUse={() => use({ starterKey: starter.key })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="org" className="mt-4">
          {templates.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : own.length === 0 ? (
            <EmptyState
              title="No templates of your own yet"
              description="Save a page as a template, or write one here."
              action={
                canManage
                  ? {
                      label: "New template",
                      onClick: () => {
                        setEditing(undefined);
                        setEditOpen(true);
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {own.map((template) => (
                <TemplateCard
                  key={template.id}
                  name={template.name}
                  description={template.description}
                  useCount={template.useCount}
                  onUse={() => use({ templateId: template.id })}
                  onPreview={() => setPreview({ id: template.id, name: template.name })}
                  onEdit={
                    canManage
                      ? () => {
                          setEditing(template);
                          setEditOpen(true);
                        }
                      : undefined
                  }
                  onDelete={
                    canManage
                      ? () =>
                          deleteTemplate.mutate(template.id, {
                            onSuccess: () => toast.success("Template deleted"),
                            onError: () => toast.error("Couldn't delete the template."),
                          })
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditTemplateDialog template={editing} open={editOpen} onOpenChange={setEditOpen} />
      <TemplatePreviewDialog
        templateId={preview?.id}
        name={preview?.name ?? ""}
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
        onUse={() => {
          if (preview) use({ templateId: preview.id });
          setPreview(null);
        }}
      />
    </PageWrapper>
  );
}
