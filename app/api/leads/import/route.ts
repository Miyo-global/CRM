import { type NextRequest } from "next/server";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";

const leadRowSchema = z.object({
  name: z.string().min(1, "Lead name is required"),
  email: z.string().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.enum(["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"]).optional(),
  notes: z.string().optional(),
  city: z.string().optional(),
  designation: z.string().optional(),
  referredBy: z.string().optional(),
  potentialValue: z.string().optional(),
  investmentInterest: z.string().optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  tags: z.array(z.string()).optional(),
});

const schema = z.object({
  leads: z.array(leadRowSchema).min(1).max(1000),
  duplicateAction: z.enum(["skip", "update", "import"]).default("skip"),
  autoDistribute: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, schema);
    const orgId = session.orgId!;
    const userId = session.user.id;
    const CHUNK_SIZE = 100;

    const importEmails = input.leads
      .map((l) => l.email?.toLowerCase())
      .filter((e): e is string => !!e && e !== "");
    const importPhones = input.leads.map((l) => l.phone).filter((p): p is string => !!p);

    const existingLeads =
      importEmails.length > 0 || importPhones.length > 0
        ? await db.query.leads.findMany({
            where: and(
              eq(leads.orgId, orgId),
              sql`(LOWER(${leads.email}) IN (${sql.join(importEmails.map((e) => sql`${e}`), sql`, `)}) OR ${leads.phone} IN (${sql.join(importPhones.map((p) => sql`${p}`), sql`, `)}))`
            ),
            columns: { id: true, email: true, phone: true },
          })
        : [];

    const dupEmails = new Set(existingLeads.map((l) => l.email?.toLowerCase()).filter(Boolean));
    const dupPhones = new Set(existingLeads.map((l) => l.phone).filter(Boolean));
    const emailToLeadId = new Map<string, number>();
    const phoneToLeadId = new Map<string, number>();
    for (const l of existingLeads) {
      if (l.email) emailToLeadId.set(l.email.toLowerCase(), l.id);
      if (l.phone) phoneToLeadId.set(l.phone, l.id);
    }

    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const importedLeadIds: number[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < input.leads.length; i += CHUNK_SIZE) {
      const chunk = input.leads.slice(i, i + CHUNK_SIZE);
      const toInsert: typeof chunk = [];

      for (let j = 0; j < chunk.length; j++) {
        const lead = chunk[j];
        const rowNum = i + j + 2;
        const isDuplicate =
          (lead.email && dupEmails.has(lead.email.toLowerCase())) ||
          (lead.phone && dupPhones.has(lead.phone));

        if (isDuplicate) {
          if (input.duplicateAction === "skip") {
            skipped++;
            errors.push({ row: rowNum, message: `Duplicate (${lead.email || lead.phone})` });
            continue;
          } else if (input.duplicateAction === "update") {
            try {
              const matchId =
                lead.email && emailToLeadId.has(lead.email.toLowerCase())
                  ? emailToLeadId.get(lead.email.toLowerCase())
                  : lead.phone
                    ? phoneToLeadId.get(lead.phone)
                    : undefined;
              if (matchId === undefined) {
                errors.push({ row: rowNum, message: "Failed to update duplicate" });
                continue;
              }
              await db.update(leads)
                .set({ name: lead.name, company: lead.company || null, notes: lead.notes || null, updatedAt: new Date() })
                .where(and(eq(leads.orgId, orgId), eq(leads.id, matchId)));
              updated++;
            } catch {
              errors.push({ row: rowNum, message: "Failed to update duplicate" });
            }
            continue;
          }
        }
        if (lead.email) dupEmails.add(lead.email.toLowerCase());
        if (lead.phone) dupPhones.add(lead.phone);
        toInsert.push(lead);
      }

      if (toInsert.length > 0) {
        const values = toInsert.map((lead) => ({
            orgId,
            name: lead.name,
            email: lead.email || null,
            phone: lead.phone || null,
            company: lead.company || null,
            source: lead.source || ("other" as const),
            notes: lead.notes || null,
            city: lead.city || null,
            designation: lead.designation || null,
            referredBy: lead.referredBy || null,
            potentialValue: lead.potentialValue || null,
            investmentInterest: lead.investmentInterest || null,
            whatsappNumber: lead.whatsappNumber || null,
            website: lead.website || null,
            priority: lead.priority || ("WARM" as const),
            tags: lead.tags || null,
            status: "NEW" as const,
            assignedById: userId,
          }));
        try {
          const result = await db.insert(leads).values(values).returning({ id: leads.id });
          imported += result.length;
          importedLeadIds.push(...result.map((r) => r.id));
        } catch {
          for (let k = 0; k < values.length; k++) {
            try {
              const inserted = await db.insert(leads).values(values[k]).returning({ id: leads.id });
              imported += inserted.length;
              importedLeadIds.push(...inserted.map((r) => r.id));
            } catch (rowErr) {
              errors.push({ row: i + k + 2, message: `Insert failed: ${rowErr instanceof Error ? rowErr.message : "unknown error"}` });
            }
          }
        }
      }
    }

    let distributed = 0;
    let salesPeopleCount = 0;

    if (input.autoDistribute && importedLeadIds.length > 0) {
      try {
        const orgMembers = await db.query.organizationMembers.findMany({
          where: eq(organizationMembers.orgId, orgId),
          columns: { userId: true },
        });
        const orgMemberIds = orgMembers.map((m) => m.userId);

        const salesPeople =
          orgMemberIds.length > 0
            ? await db.query.users.findMany({
                where: and(
                  inArray(users.id, orgMemberIds),
                  eq(users.isActive, true),
                  eq(users.hasDashboardAccess, true),
                  inArray(users.role, ["SALES"])
                ),
                columns: { id: true, name: true },
              })
            : [];

        if (salesPeople.length > 0) {
          salesPeopleCount = salesPeople.length;
          const now = new Date();
          const assignmentMap = new Map<string, number[]>();
          for (const sp of salesPeople) assignmentMap.set(sp.id, []);
          for (let i = 0; i < importedLeadIds.length; i++) {
            const sp = salesPeople[i % salesPeople.length];
            assignmentMap.get(sp.id)!.push(importedLeadIds[i]);
          }
          for (const [salesPersonId, leadIds] of assignmentMap) {
            if (leadIds.length === 0) continue;
            await db.update(leads)
              .set({ assignedToId: salesPersonId, assignedById: userId, assignedAt: now, updatedAt: now })
              .where(and(inArray(leads.id, leadIds), eq(leads.orgId, orgId)));
            distributed += leadIds.length;
          }
        }
      } catch (distErr) {
        logger.error("Auto-distribute failed after bulk import", { error: distErr });
      }
    }

    return ok({ imported, skipped, updated, errors, duplicatesFound: existingLeads.length, distributed, salesPeopleCount });
  });
}
