"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Star,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  useCreateCrmPage,
  useUpdateCrmPage,
  useCrmPageAnalytics,
  type CrmPage,
  type CrmPageTestimonial,
} from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";


function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}


function AnalyticsPanel({ pageId }: { pageId: number }) {
  const { data, isLoading } = useCrmPageAnalytics(pageId, 30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary, dailyViews, deviceBreakdown, utmSourceBreakdown } = data;
  const maxViews = Math.max(...dailyViews.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold">{summary.totalViews.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Views</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold">{summary.totalLeads.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Leads Generated</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.conversionRate}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
        </div>
      </div>

      {dailyViews.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Daily Views (30 days)</p>
          <div className="flex items-end gap-0.5 h-20 bg-muted/30 rounded-md p-2">
            {dailyViews.slice(-30).map((d) => {
              const pct = Math.round((d.views / maxViews) * 100);
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-sm bg-primary/70 hover:bg-primary transition-colors cursor-default"
                  style={{ height: `${Math.max(pct, 3)}%` }}
                  title={`${d.date}: ${d.views} views`}
                />
              );
            })}
          </div>
        </div>
      )}

      {deviceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Device Breakdown</p>
          <div className="space-y-2">
            {deviceBreakdown.map((d) => {
              const total = deviceBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{d.type}</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {utmSourceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Lead Sources</p>
          <div className="space-y-1.5">
            {utmSourceBreakdown.slice(0, 8).map((r) => {
              const total = utmSourceBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <div key={r.source} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate text-muted-foreground capitalize">{r.source}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-gold"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dailyViews.length === 0 && deviceBreakdown.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No analytics data yet — publish the page to start tracking visits.
        </p>
      )}
    </div>
  );
}


function buildPreviewHtml(title: string, description: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title || "Preview"}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111; }
  .hero { background: #0f2b7f; color: #fff; padding: 3rem 1.5rem; text-align: center; }
  .hero h1 { margin: 0 0 0.75rem; font-size: 2rem; font-weight: 700; }
  .hero p { margin: 0; font-size: 1.1rem; opacity: 0.8; }
  .container { max-width: 800px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .content { line-height: 1.7; }
  .content h1, .content h2, .content h3 { margin-top: 1.5rem; }
  .content p { margin: 0.75rem 0; }
  .content ul, .content ol { padding-left: 1.5rem; }
  .cta-box { margin-top: 2rem; padding: 1.5rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .cta-box h2 { margin: 0 0 0.5rem; font-size: 1.125rem; }
  .cta-box p { margin: 0 0 1rem; font-size: 0.875rem; color: #6b7280; }
  input, textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 0.75rem; }
  button { width: 100%; padding: 0.625rem; background: #bd882c; color: #fff; border: none; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
<div class="hero">
  <h1>${title || "Your Page Title"}</h1>
  ${description ? `<p>${description}</p>` : ""}
</div>
<div class="container">
  ${content ? `<div class="content">${content}</div>` : ""}
  <div class="cta-box">
    <h2>Get in Touch</h2>
    <p>Fill in your details and we'll reach out to you shortly.</p>
    <input placeholder="Your name *" />
    <input placeholder="Email address" />
    <input placeholder="Phone number" />
    <button>Send Message</button>
  </div>
</div>
</body>
</html>`;
}


interface PageBuilderProps {
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
    page?.settings?.testimonials ?? []
  );
  const [showTrustSection, setShowTrustSection] = useState(
    page?.settings?.showTrustSection ?? false
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
          { id: page.id, title: title.trim(), slug, description: description.trim() || null, content: content || null, isPublished: effectivePublished, settings },
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
          { title: title.trim(), slug, description: description.trim() || undefined, content: content || undefined, isPublished: effectivePublished },
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
    [isEditing, page, title, slug, description, content, isPublished, testimonials, showTrustSection, createPage, updatePage, router],
  );

  const publicUrl = slug ? `/${slug}` : null;

  return (
    <PageWrapper
      title={isEditing ? (page.title ?? "Edit Page") : "New Landing Page"}
      subtitle={isEditing ? `Editing /${page.slug ?? ""}` : "Build a CRM-hosted landing page"}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketing/landing-pages">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Link>
          </Button>

          {isEditing && publicUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                View Live
              </a>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowPreview((p) => !p)}>
            {showPreview ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Clock className="mr-1.5 h-4 w-4" />}
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Globe className="mr-1.5 h-4 w-4" />}
            {isPublished ? "Update & Publish" : "Publish"}
          </Button>
        </div>
      }
    >
      {isEditing && (
        <div className="flex items-center gap-3 rounded-lg border px-4 py-2.5 mb-4 bg-card">
          <div className="flex items-center gap-2 flex-1">
            {isPublished ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  Published
                </span>
                {publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground ml-2 underline-offset-2 hover:underline"
                  >
                    {publicUrl}
                  </a>
                )}
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Draft — not visible publicly</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isPublished ? "Unpublish" : "Publish"}
            </span>
            <Switch
              checked={isPublished}
              onCheckedChange={(checked) => handleSave(checked)}
              disabled={isPending}
            />
          </div>
        </div>
      )}

      {isEditing ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "editor" | "testimonials" | "analytics")}>
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <EditorLayout
              title={title}
              setTitle={setTitle}
              slug={slug}
              handleSlugChange={handleSlugChange}
              description={description}
              setDescription={setDescription}
              content={content}
              setContent={setContent}
              showPreview={showPreview}
              previewHtml={previewHtml}
            />
          </TabsContent>

          <TabsContent value="testimonials">
            <TestimonialsEditor
              testimonials={testimonials}
              setTestimonials={setTestimonials}
              showTrustSection={showTrustSection}
              setShowTrustSection={setShowTrustSection}
              onSave={() => handleSave()}
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
        <EditorLayout
          title={title}
          setTitle={setTitle}
          slug={slug}
          handleSlugChange={handleSlugChange}
          description={description}
          setDescription={setDescription}
          content={content}
          setContent={setContent}
          showPreview={showPreview}
          previewHtml={previewHtml}
        />
      )}
    </PageWrapper>
  );
}


interface EditorLayoutProps {
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  handleSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description: string;
  setDescription: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  showPreview: boolean;
  previewHtml: string;
}

function EditorLayout({
  title, setTitle,
  slug, handleSlugChange,
  description, setDescription,
  content, setContent,
  showPreview, previewHtml,
}: EditorLayoutProps) {
  return (
    <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "max-w-2xl"}`}>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="lp-title">
            Page Title <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="lp-title"
            placeholder="e.g. Get a Free Consultation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lp-slug">
            URL Slug <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <div className="flex items-center rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring bg-background">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input shrink-0">
              /
            </span>
            <input
              id="lp-slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="my-landing-page"
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Only lowercase letters, numbers, and hyphens. Public URL: <code className="text-xs">/{slug || "…"}</code>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lp-desc">Sub-headline / Description</Label>
          <Input
            id="lp-desc"
            placeholder="Shown below the hero title — keep it under 160 characters"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="lp-content">Body Content (HTML)</Label>
            <Badge variant="outline" className="text-xs">HTML</Badge>
          </div>
          <Textarea
            id="lp-content"
            placeholder={`<h2>Why Choose Us?</h2>\n<p>We provide...</p>\n<ul>\n  <li>Point one</li>\n  <li>Point two</li>\n</ul>`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="font-mono text-xs resize-y"
          />
          <p className="text-xs text-muted-foreground">
            HTML content rendered in the body. A contact form is automatically appended below.
          </p>
        </div>
      </div>

      {showPreview && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Live Preview</p>
            <Badge variant="secondary" className="text-xs">Approximate</Badge>
          </div>
          <div className="flex-1 border rounded-lg overflow-hidden min-h-[600px]">
            <iframe
              key={previewHtml}
              srcDoc={previewHtml}
              title="Page Preview"
              className="w-full h-full min-h-[600px]"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}


interface TestimonialsEditorProps {
  testimonials: CrmPageTestimonial[];
  setTestimonials: (t: CrmPageTestimonial[]) => void;
  showTrustSection: boolean;
  setShowTrustSection: (v: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

function TestimonialsEditor({
  testimonials,
  setTestimonials,
  showTrustSection,
  setShowTrustSection,
  onSave,
  isSaving,
}: TestimonialsEditorProps) {
  const addTestimonial = useCallback(() => {
    setTestimonials([
      ...testimonials,
      { id: crypto.randomUUID(), name: "", text: "", rating: 5 },
    ]);
  }, [testimonials, setTestimonials]);

  const removeTestimonial = useCallback((id: string) => {
    setTestimonials(testimonials.filter((t) => t.id !== id));
  }, [testimonials, setTestimonials]);

  const updateTestimonial = useCallback(
    (id: string, field: keyof CrmPageTestimonial, value: string | number) => {
      setTestimonials(testimonials.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    },
    [testimonials, setTestimonials]
  );

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Trust & Social Proof Section</CardTitle>
              <CardDescription>Show testimonials below the hero on your landing page.</CardDescription>
            </div>
            <Switch checked={showTrustSection} onCheckedChange={setShowTrustSection} />
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {testimonials.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={t.name}
                      onChange={(e) => updateTestimonial(t.id, "name", e.target.value)}
                      placeholder="Jane Doe"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Role / Company</Label>
                    <Input
                      value={t.role ?? ""}
                      onChange={(e) => updateTestimonial(t.id, "role", e.target.value)}
                      placeholder="CEO, Acme Corp"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive mt-5"
                  onClick={() => removeTestimonial(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Testimonial Text</Label>
                <Textarea
                  value={t.text}
                  onChange={(e) => updateTestimonial(t.id, "text", e.target.value)}
                  placeholder="This service transformed our business..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Rating</Label>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateTestimonial(t.id, "rating", star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-4 w-4 ${(t.rating ?? 0) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" size="sm" onClick={addTestimonial} className="gap-2 w-full">
          <Plus className="h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save Testimonials
      </Button>
    </div>
  );
}
