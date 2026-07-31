import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { aiInvoke, isOpenAIConfigured } from "@/lib/ai/openai";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema/crm";
import { users } from "@/lib/db/schema/auth";
import { and, eq, gte, lte, ilike, inArray } from "drizzle-orm";

const bodySchema = z.object({
  query: z.string().min(1).max(500),
});

const FilterSchema = z.object({
  status: z
    .array(z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]))
    .optional(),
  priority: z.array(z.enum(["HOT", "WARM", "COLD"])).optional(),
  source: z.string().optional(),
  city: z.string().optional(),
  minValue: z.number().min(0).optional(),
  maxValue: z.number().min(0).optional(),
  company: z.string().optional(),
  nameSearch: z.string().optional(),
  assignedToName: z.string().optional(),
});

type ParsedFilters = z.infer<typeof FilterSchema>;


export async function POST(req: NextRequest) {
  return withAuth<unknown>(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI search is not configured. Set OPENAI_API_KEY.", 503);
    }

    const body = await req.json();
    const { query } = bodySchema.parse(body);

    const parsedFilters: ParsedFilters = await aiInvoke({
      model: "fast",
      schema: FilterSchema,
      schemaName: "lead_filters",
      system:
        "You are a CRM query parser. Convert natural language lead search queries into structured filter objects. " +
        "For Indian context: '1L' = 100000, '5L' = 500000, '10L' = 1000000, '1Cr' = 10000000, '2Cr' = 20000000. " +
        "Status values must be uppercase: NEW, CONTACTED, INTERESTED, QUALIFIED, CONVERTED, LOST. " +
        "Priority values must be uppercase: HOT, WARM, COLD. " +
        "Source values: referral, campaign, cold_call, website, social_media, walk_in, other. " +
        "Extract city, company, name, and assignedToName from the query when mentioned. " +
        "Only populate fields that are clearly mentioned in the query.",
      user: query,
    });

    const conditions = [eq(leads.orgId, session.orgId)];

    if (parsedFilters.status?.length) {
      conditions.push(
        inArray(leads.status, parsedFilters.status as Array<"NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "CONVERTED" | "LOST">),
      );
    }

    if (parsedFilters.priority?.length) {
      conditions.push(
        inArray(leads.priority, parsedFilters.priority as Array<"HOT" | "WARM" | "COLD">),
      );
    }

    if (parsedFilters.source) {
      conditions.push(ilike(leads.source, `%${parsedFilters.source}%`));
    }

    if (parsedFilters.city) {
      conditions.push(ilike(leads.city, `%${parsedFilters.city}%`));
    }

    if (parsedFilters.company) {
      conditions.push(ilike(leads.company, `%${parsedFilters.company}%`));
    }

    if (parsedFilters.nameSearch) {
      conditions.push(ilike(leads.name, `%${parsedFilters.nameSearch}%`));
    }

    if (
      parsedFilters.minValue !== undefined &&
      parsedFilters.maxValue !== undefined &&
      parsedFilters.minValue > parsedFilters.maxValue
    ) {
      const swap = parsedFilters.minValue;
      parsedFilters.minValue = parsedFilters.maxValue;
      parsedFilters.maxValue = swap;
    }

    if (parsedFilters.minValue !== undefined) {
      conditions.push(gte(leads.potentialValue, String(parsedFilters.minValue)));
    }

    if (parsedFilters.maxValue !== undefined) {
      conditions.push(lte(leads.potentialValue, String(parsedFilters.maxValue)));
    }

    const rows = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        company: leads.company,
        status: leads.status,
        priority: leads.priority,
        source: leads.source,
        value: leads.potentialValue,
        city: leads.city,
        assignedToId: leads.assignedToId,
        assigneeName: users.name,
        assigneeFirstName: users.firstName,
        assigneeLastName: users.lastName,
      })
      .from(leads)
      .leftJoin(users, eq(leads.assignedToId, users.id))
      .where(and(...conditions))
      .limit(50);

    let filteredRows = rows;
    if (parsedFilters.assignedToName) {
      const search = parsedFilters.assignedToName.toLowerCase();
      filteredRows = rows.filter((r) => {
        const fullName =
          `${r.assigneeFirstName ?? ""} ${r.assigneeLastName ?? ""}`.trim() ||
          r.assigneeName ||
          "";
        return fullName.toLowerCase().includes(search);
      });
    }

    const result = filteredRows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      company: r.company,
      status: r.status,
      priority: r.priority,
      source: r.source,
      value: r.value !== null ? Number(r.value) : null,
      city: r.city,
      assignedTo:
        `${r.assigneeFirstName ?? ""} ${r.assigneeLastName ?? ""}`.trim() ||
        r.assigneeName ||
        null,
    }));

    return ok({
      query,
      parsedFilters,
      leads: result,
      total: result.length,
    });
  });
}
