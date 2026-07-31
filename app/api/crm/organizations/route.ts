import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmOrganizations } from "@/lib/db/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const parsed = listQuerySchema.safeParse({
      search: req.nextUrl.searchParams.get("search") ?? undefined,
      page: req.nextUrl.searchParams.get("page") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const { search, page, limit } = parsed.success
      ? parsed.data
      : { search: undefined, page: 1, limit: 20 };

    const where = and(
      eq(crmOrganizations.orgId, session.orgId),
      search
        ? ilike(crmOrganizations.name, `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`)
        : undefined
    );

    const offset = (page - 1) * limit;

    const [organizations, countRow] = await Promise.all([
      db
        .select()
        .from(crmOrganizations)
        .where(where)
        .orderBy(desc(crmOrganizations.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(crmOrganizations)
        .where(where)
        .then((rows) => rows[0]),
    ]);

    const totalCount = Number(countRow?.count ?? 0);
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);

    return ok({
      organizations,
      totalCount,
      page,
      totalPages,
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);
    const org = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: crmOrganizations.id })
        .from(crmOrganizations)
        .where(
          and(
            eq(crmOrganizations.orgId, session.orgId),
            ilike(crmOrganizations.name, input.name)
          )
        )
        .limit(1);
      if (existing) {
        return null;
      }
      const [created] = await tx
        .insert(crmOrganizations)
        .values({
          orgId: session.orgId,
          name: input.name,
          domain: input.domain ?? null,
          industry: input.industry ?? null,
          size: input.size ?? null,
          website: input.website || null,
          linkedinUrl: input.linkedinUrl || null,
          description: input.description ?? null,
        })
        .returning();
      return created;
    });
    if (!org) {
      return err("An organization with this name already exists", 409);
    }
    return ok(org, 201);
  });
}
