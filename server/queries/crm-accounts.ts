"server-only";

import { db } from "@/lib/db";
import { crmOrganizations, contacts, deals, leads } from "@/lib/db/schema";
import { eq, and, sql, inArray, or } from "drizzle-orm";

export interface OrgHierarchyNode {
  id: number;
  name: string;
  industry: string | null;
  healthScore: number | null;
  parentId: number | null;
  children: OrgHierarchyNode[];
}

export interface OrgRollup {
  totalContacts: number;
  totalDeals: number;
  openDeals: number;
  totalDealValue: number;
  totalLeads: number;
}

export interface OrgTimelineEvent {
  id: string;
  date: string;
  type: "contact_created" | "deal_created" | "lead_linked" | "note_added";
  description: string;
  entityId: number;
}


export async function getAncestorChain(
  orgId: string,
  accountId: number,
): Promise<{ id: number; name: string }[]> {
  const ancestors: { id: number; name: string }[] = [];
  let currentId: number | null = accountId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const rows: { id: number; name: string; parentId: number | null }[] = await db
      .select({ id: crmOrganizations.id, name: crmOrganizations.name, parentId: crmOrganizations.parentId })
      .from(crmOrganizations)
      .where(and(eq(crmOrganizations.id, currentId), eq(crmOrganizations.orgId, orgId)))
      .limit(1);
    const row: { id: number; name: string; parentId: number | null } | null = rows[0] ?? null;

    if (!row) break;
    if (row.id !== accountId) {
      ancestors.unshift({ id: row.id, name: row.name });
    }
    currentId = row.parentId;
  }

  return ancestors;
}


export async function wouldCreateCycle(
  orgId: string,
  accountId: number,
  candidateParentId: number,
): Promise<boolean> {
  if (candidateParentId === accountId) return true;

  let currentId: number | null = candidateParentId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    if (currentId === accountId) return true;

    const cycleRows: { parentId: number | null }[] = await db
      .select({ parentId: crmOrganizations.parentId })
      .from(crmOrganizations)
      .where(and(eq(crmOrganizations.id, currentId), eq(crmOrganizations.orgId, orgId)))
      .limit(1);
    const row: { parentId: number | null } | null = cycleRows[0] ?? null;

    if (!row) break;
    currentId = row.parentId;
  }

  return false;
}


export async function getAllDescendantIds(
  orgId: string,
  accountId: number,
): Promise<number[]> {
  const allIds: number[] = [accountId];
  const queue: number[] = [accountId];

  while (queue.length > 0) {
    const batch = queue.splice(0, 50);
    const children = await db
      .select({ id: crmOrganizations.id })
      .from(crmOrganizations)
      .where(
        and(
          eq(crmOrganizations.orgId, orgId),
          sql`${crmOrganizations.parentId} = ANY(ARRAY[${sql.join(batch.map(b => sql`${b}`), sql`, `)}]::int[])`,
        ),
      );

    for (const child of children) {
      if (!allIds.includes(child.id)) {
        allIds.push(child.id);
        queue.push(child.id);
      }
    }
  }

  return allIds;
}


export async function getAccountHierarchy(
  orgId: string,
  accountId: number,
): Promise<OrgHierarchyNode | null> {
  const ids = await getAllDescendantIds(orgId, accountId);

  const rows = await db
    .select({
      id: crmOrganizations.id,
      name: crmOrganizations.name,
      industry: crmOrganizations.industry,
      healthScore: crmOrganizations.healthScore,
      parentId: crmOrganizations.parentId,
    })
    .from(crmOrganizations)
    .where(
      and(
        eq(crmOrganizations.orgId, orgId),
        inArray(crmOrganizations.id, ids),
      ),
    );

  const nodeMap = new Map<number, OrgHierarchyNode>();
  for (const row of rows) {
    nodeMap.set(row.id, { ...row, children: [] });
  }

  let root: OrgHierarchyNode | null = null;
  for (const node of nodeMap.values()) {
    if (node.id === accountId) {
      root = node;
    } else if (node.parentId !== null && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    }
  }

  return root;
}


export async function getAccountRollup(
  orgId: string,
  accountId: number,
): Promise<OrgRollup> {
  const ids = await getAllDescendantIds(orgId, accountId);

  const contactCountRows = await db
    .select({ count: sql<string>`count(*)` })
    .from(contacts)
    .where(
      and(
        eq(contacts.orgId, orgId),
        sql`${contacts.organizationId} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`,
      ),
    );

  const totalContacts = Number(contactCountRows[0]?.count ?? 0);

  const orgRows = await db
    .select({ name: crmOrganizations.name })
    .from(crmOrganizations)
    .where(
      and(
        eq(crmOrganizations.orgId, orgId),
        inArray(crmOrganizations.id, ids),
      ),
    );

  const orgNames = orgRows.map((r) => r.name);

  let totalDeals = 0;
  let openDeals = 0;
  let totalDealValue = 0;

  if (orgNames.length > 0) {
    const dealRows = await db
      .select({
        stage: deals.stage,
        value: deals.value,
      })
      .from(deals)
      .where(
        and(
          eq(deals.orgId, orgId),
          or(...orgNames.map((n) => sql`LOWER(TRIM(${deals.name})) = LOWER(${n.trim()})`)),
        ),
      );

    totalDeals = dealRows.length;
    openDeals = dealRows.filter(
      (d) => !["WON", "LOST"].includes(d.stage),
    ).length;
    totalDealValue = dealRows.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
  }

  const leadCountRows = await db
    .select({ count: sql<string>`count(*)` })
    .from(leads)
    .where(
      and(
        eq(leads.orgId, orgId),
        orgNames.length > 0
          ? or(...orgNames.map((n) => sql`LOWER(TRIM(${leads.company})) = LOWER(${n.trim()})`))
          : sql`false`,
      ),
    );

  const totalLeads = Number(leadCountRows[0]?.count ?? 0);

  return { totalContacts, totalDeals, openDeals, totalDealValue, totalLeads };
}


export async function getAccountTimeline(
  orgId: string,
  accountId: number,
  limit = 20,
): Promise<OrgTimelineEvent[]> {
  const orgRow = await db
    .select({ name: crmOrganizations.name, notes: crmOrganizations.notes, updatedAt: crmOrganizations.updatedAt })
    .from(crmOrganizations)
    .where(and(eq(crmOrganizations.id, accountId), eq(crmOrganizations.orgId, orgId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!orgRow) return [];

  const events: OrgTimelineEvent[] = [];

  const contactRows = await db
    .select({ id: contacts.id, name: contacts.name, createdAt: contacts.createdAt })
    .from(contacts)
    .where(and(eq(contacts.orgId, orgId), eq(contacts.organizationId, accountId)))
    .orderBy(sql`${contacts.createdAt} desc`)
    .limit(limit);

  for (const c of contactRows) {
    events.push({
      id: `contact-${c.id}`,
      date: c.createdAt?.toISOString() ?? new Date().toISOString(),
      type: "contact_created",
      description: `Contact "${c.name}" added to organization`,
      entityId: c.id,
    });
  }

  const dealRows = await db
    .select({ id: deals.id, name: deals.name, stage: deals.stage, createdAt: deals.createdAt })
    .from(deals)
    .where(
      and(
        eq(deals.orgId, orgId),
        sql`LOWER(TRIM(${deals.name})) = LOWER(${orgRow.name.trim()})`,
      ),
    )
    .orderBy(sql`${deals.createdAt} desc`)
    .limit(limit);

  for (const d of dealRows) {
    events.push({
      id: `deal-${d.id}`,
      date: d.createdAt?.toISOString() ?? new Date().toISOString(),
      type: "deal_created",
      description: `Deal "${d.name}" (${d.stage}) linked`,
      entityId: d.id,
    });
  }

  const leadRows = await db
    .select({ id: leads.id, name: leads.name, createdAt: leads.createdAt })
    .from(leads)
    .where(
      and(
        eq(leads.orgId, orgId),
        sql`LOWER(TRIM(${leads.company})) = LOWER(${orgRow.name.trim()})`,
      ),
    )
    .orderBy(sql`${leads.createdAt} desc`)
    .limit(limit);

  for (const l of leadRows) {
    events.push({
      id: `lead-${l.id}`,
      date: l.createdAt?.toISOString() ?? new Date().toISOString(),
      type: "lead_linked",
      description: `Lead "${l.name ?? "Unnamed"}" linked (company match)`,
      entityId: l.id,
    });
  }

  if (orgRow.notes) {
    events.push({
      id: `note-${accountId}`,
      date: (orgRow.updatedAt ?? new Date()).toISOString(),
      type: "note_added",
      description: "Account notes updated",
      entityId: accountId,
    });
  }

  return events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
