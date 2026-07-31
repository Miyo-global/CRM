"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useCreateCrmPage,
  useUpdateCrmPage,
  type CrmPage,
  type CrmPageTestimonial,
} from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";

import { slugify } from "./slugify";
import { buildPreviewHtml } from "./preview-html";
import { AnalyticsPanel } from "./analytics-panel";
import { EditorLayout } from "./editor-layout";
import { TestimonialsEditor } from "./testimonials-editor";
import { PageBuilderToolbar } from "./page-builder-toolbar";
import { PublishedStatusBanner } from "./published-status-banner";


export interface PageBuilderProps {
  page?: CrmPage;
}


export function PageBuilder({ page }: PageBuilderProps) {
  const router = useRouter();
  const isEditing = page !== undefined;

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [description, setDescription] = useState(page?.description ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? false);
  const [testimonials, setTestimonials] = useState<CrmPageTestimonial[]>(
    page?.settings?.testimonials ?? [],
  );
  const [showTrustSection, setShowTrustSection] = useState(
    page?.settings?.showTrustSection ?? false,
  );
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "testimonials" | "analytics">("editor");

  const createPage = useCreateCrmPage();
  const updatePage = useUpdateCrmPage();
  const isPending = createPage.isPending || updatePage.isPending;

  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  const previewHtml = useMemo(
    () => buildPreviewHtml(title, description, content),
    [title, description, content],
  );

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setSlug(slugify(e.target.value));
  }, []);

  const handleSave = useCallback(
    (publish?: boolean) => {
      const effectivePublished = publish !== undefined ? publish : isPublished;
      if (!title.trim()) { toast.error("Title is required."); return; }
      if (!slug.trim()) { toast.error("Slug is required."); return; }

      const settings = { testimonials, showTrustSection };

      if (isEditing) {
        updatePage.mutate(
          {
            id: page.id,
            title: title.trim(),
            slug,
            description: description.trim() || null,
            content: content || null,
            isPublished: effectivePublished,
            settings,
          },
          {
            onSuccess: () => {
              toast.success(effectivePublished ? "Page saved and published." : "Page saved.");
              setIsPublished(effectivePublished);
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createPage.mutate(
          {
            title: title.trim(),
            slug,
            description: description.trim() || undefined,
            content: content || undefined,
            isPublished: effectivePublished,
          },
          {
            onSuccess: (created) => {
              toast.success("Landing page created.");
              router.push(`/marketing/landing-pages/${created.id}/edit`);
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      }
    },
    [
      isEditing, page, title, slug, description, content,
      isPublished, testimonials, showTrustSection, createPage, updatePage, router,
    ],
  );

  const publicUrl = slug ? `/${slug}` : null;

  const handleTogglePreview = useCallback(() => setShowPreview((p) => !p), []);
  const handleSaveDraft = useCallback(() => handleSave(false), [handleSave]);
  const handlePublish = useCallback(() => handleSave(true), [handleSave]);
  const handlePublishToggle = useCallback((checked: boolean) => handleSave(checked), [handleSave]);
  const handleTabChange = useCallback(
    (v: string) => setActiveTab(v as "editor" | "testimonials" | "analytics"),
    [],
  );
  const handleSaveTestimonials = useCallback(() => handleSave(), [handleSave]);

  const editorProps = {
    title, setTitle,
    slug, handleSlugChange,
    description, setDescription,
    content, setContent,
    showPreview, previewHtml,
  };

  return (
    <PageWrapper
      title={isEditing ? (page.title ?? "Edit Page") : "New Landing Page"}
      subtitle={isEditing ? `Editing /${page.slug ?? ""}` : "Build a CRM-hosted landing page"}
      actions={
        <PageBuilderToolbar
          isEditing={isEditing}
          publicUrl={publicUrl}
          showPreview={showPreview}
          onTogglePreview={handleTogglePreview}
          isPending={isPending}
          isPublished={isPublished}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
        />
      }
    >
      {isEditing && (
        <PublishedStatusBanner
          isPublished={isPublished}
          publicUrl={publicUrl}
          isPending={isPending}
          onToggle={handlePublishToggle}
        />
      )}

      {isEditing ? (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <EditorLayout {...editorProps} />
          </TabsContent>

          <TabsContent value="testimonials">
            <TestimonialsEditor
              testimonials={testimonials}
              setTestimonials={setTestimonials}
              showTrustSection={showTrustSection}
              setShowTrustSection={setShowTrustSection}
              onSave={handleSaveTestimonials}
              isSaving={isPending}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Page Analytics (Last 30 Days)</CardTitle>
                <CardDescription>
                  Views, lead conversions, device breakdown, and UTM source attribution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsPanel pageId={page.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <EditorLayout {...editorProps} />
      )}
    </PageWrapper>
  );
}
