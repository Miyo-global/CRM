import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { landingPages } from "@/lib/db/schema/marketing";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";

const testimonialSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  role: z.string().optional(),
  text: z.string().min(1),
  avatar: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

const settingsSchema = z.object({
  testimonials: z.array(testimonialSchema).optional(),
  trustBadges: z.array(z.string()).optional(),
  showTrustSection: z.boolean().optional(),
}).optional();

const createSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  title: z.string().min(1).max(300),
  content: z.string().max(100_000).optional(),
  isPublished: z.boolean().optional().default(false),
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional(),
  settings: settingsSchema,
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const pages = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.orgId, session.orgId))
      .orderBy(desc(landingPages.createdAt));

    return ok(pages);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [existing] = await db
      .select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, input.slug));

    if (existing) {
      return err("A landing page with this slug already exists.", 409);
    }

    const [page] = await db
      .insert(landingPages)
      .values({
        orgId: session.orgId,
        name: input.name ?? input.title,
        slug: input.slug,
        title: input.title,
        content: input.content ?? null,
        isPublished: input.isPublished,
        description: input.description ?? null,
        settings: input.settings ?? null,
        url: `/${input.slug}`,
        createdBy: session.user.id,
      })
      .returning();

    return ok(page, 201);
  });
}
