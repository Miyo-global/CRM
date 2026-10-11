"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { NotFoundIllustration } from "@/components/illustrations";
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-115 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-xs" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </PageWrapper>
  );
}

export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { templateId } = use(params);
  const id = Number(templateId);
  const { data: template, isLoading, isError, error, refetch } = useDocumentTemplate(id);

  if (isLoading) return <EditTemplateSkeleton />;

  if (isError) {
    return (
      <PageWrapper title="Edit Template">
        <QueryErrorState title="Couldn't load template" error={error} onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  if (!template) {
    return (
      <PageWrapper title="Template Not Found">
        <EmptyState
          illustration={<NotFoundIllustration />}
          title="Template Not Found"
          description="This template does not exist or has been removed."
        />
      </PageWrapper>
    );
  }

  return <TemplateEditor template={template} />;
}
