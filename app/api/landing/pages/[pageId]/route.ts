import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { landingPages } from "@/lib/db/schema/marketing";
import type { InferInsertModel } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";

type LandingPageUpdate = Partial<InferInsertModel<typeof landingPages>>;

type Params = { params: Promise<{ pageId: string }> };

const testimonialSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  role: z.string().optional(),
  text: z.string().min(1),
  avatar: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

const updateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .optional(),
  title: z.string().min(1).max(300).optional(),
  content: z.string().max(100_000).optional().nullable(),
  isPublished: z.boolean().optional(),
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional().nullable(),
  settings: z.object({
    testimonials: z.array(testimonialSchema).optional(),
    trustBadges: z.array(z.string()).optional(),
    showTrustSection: z.boolean().optional(),
  }).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { pageId } = await params;
    const pid = Number(pageId);
    if (!Number.isFinite(pid) || pid <= 0) return err("Invalid page ID.", 400);

    const [page] = await db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.id, pid), eq(landingPages.orgId, session.orgId)));

    if (!page) return err("Landing page not found.", 404);

    return ok(page);
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { pageId } = await params;
    const pid = Number(pageId);
    if (!Number.isFinite(pid) || pid <= 0) return err("Invalid page ID.", 400);

    const input = await parseBody(req, updateSchema);

    if (input.slug !== undefined) {
      const [conflict] = await db
        .select({ id: landingPages.id })
        .from(landingPages)
        .where(eq(landingPages.slug, input.slug));

      if (conflict && conflict.id !== pid) {
        return err("A landing page with this slug already exists.", 409);
      }
    }

    const updates: LandingPageUpdate = { updatedAt: new Date() };
    if (input.slug !== undefined) { updates.slug = input.slug; updates.url = `/${input.slug}`; }
    if (input.title !== undefined) updates.title = input.title;
    if (input.content !== undefined) updates.content = input.content;
    if (input.isPublished !== undefined) updates.isPublished = input.isPublished;
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.settings !== undefined) updates.settings = input.settings ?? undefined;

    const [updated] = await db
      .update(landingPages)
      .set(updates)
      .where(and(eq(landingPages.id, pid), eq(landingPages.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Landing page not found.", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { pageId } = await params;
    const pid = Number(pageId);
    if (!Number.isFinite(pid) || pid <= 0) return err("Invalid page ID.", 400);

    const [archived] = await db
      .update(landingPages)
      .set({ isActive: false, isPublished: false, updatedAt: new Date() })
      .where(and(eq(landingPages.id, pid), eq(landingPages.orgId, session.orgId)))
      .returning({ id: landingPages.id });

    if (!archived) return err("Landing page not found.", 404);

    return ok({ id: archived.id, archived: true });
  });
}
