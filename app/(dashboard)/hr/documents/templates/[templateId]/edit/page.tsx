"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDocumentTemplate } from "@/lib/api/hooks/hr/document-templates";
import { TemplateEditor } from "@/features/hr/documents/template-editor";

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>;
}

function EditTemplateSkeleton() {
  return (
    <PageWrapper
      title="Edit Template"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      }
    >
      <div className="max-w-3xl mx-auto space-y-5">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[420px] w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { templateId } = use(params);
  const id = Number(templateId);
  const { data: template, isLoading } = useDocumentTemplate(id);

  if (isLoading) return <EditTemplateSkeleton />;

  if (!template) {
    return (
      <PageWrapper title="Template Not Found">
        <p className="text-sm text-muted-foreground">
          This template does not exist or has been removed.
        </p>
      </PageWrapper>
    );
  }

  return <TemplateEditor template={template} />;
}
