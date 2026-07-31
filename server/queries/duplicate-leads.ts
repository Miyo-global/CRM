import "server-only";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema/crm";
import { eq, isNull, and } from "drizzle-orm";

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;
  if (longer.length === 0) return 1;
  const prev = new Array<number>(shorter.length + 1);
  const curr = new Array<number>(shorter.length + 1);
  for (let j = 0; j <= shorter.length; j++) prev[j] = j;
  for (let i = 1; i <= longer.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= shorter.length; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= shorter.length; j++) prev[j] = curr[j]!;
  }
  const distance = prev[shorter.length]!;
  return (longer.length - distance) / longer.length;
}

export interface DuplicateLeadEntry {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: Date | null;
}

export interface DuplicateGroup {
  leads: DuplicateLeadEntry[];
  matchReason: string[];
  score: number;
}

const MAX_LEADS_FOR_DUPLICATE_SCAN = 2000;

export async function findDuplicateLeads(orgId: string): Promise<DuplicateGroup[]> {
  const allLeads = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      company: leads.company,
      status: leads.status,
      source: leads.source,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(eq(leads.orgId, orgId), isNull(leads.deletedAt)))
    .limit(MAX_LEADS_FOR_DUPLICATE_SCAN + 1);

  if (allLeads.length > MAX_LEADS_FOR_DUPLICATE_SCAN) {
    allLeads.length = MAX_LEADS_FOR_DUPLICATE_SCAN;
  }

  const groups: DuplicateGroup[] = [];
  const paired = new Set<string>();

  const buckets = new Map<string, number[]>();
  for (let i = 0; i < allLeads.length; i++) {
    const lead = allLeads[i]!;
    const candidates = new Set<string>();
    const emailKey = normalize(lead.email);
    if (emailKey) candidates.add(`e:${emailKey}`);
    const phoneKey = (lead.phone ?? "").replace(/\D/g, "");
    if (phoneKey.length >= 8) candidates.add(`p:${phoneKey}`);
    const namePrefix = normalize(lead.name).slice(0, 3);
    if (namePrefix) candidates.add(`n:${namePrefix}`);
    for (const k of candidates) {
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(i);
    }
  }

  const candidatePairs = new Set<string>();
  for (const indexes of buckets.values()) {
    if (indexes.length < 2 || indexes.length > 200) continue;
    for (let x = 0; x < indexes.length; x++) {
      for (let y = x + 1; y < indexes.length; y++) {
        const lo = Math.min(indexes[x]!, indexes[y]!);
        const hi = Math.max(indexes[x]!, indexes[y]!);
        candidatePairs.add(`${lo}:${hi}`);
      }
    }
  }

  for (const pair of candidatePairs) {
    const [iStr, jStr] = pair.split(":");
    const i = Number(iStr);
    const j = Number(jStr);
    {
      const a = allLeads[i]!;
      const b = allLeads[j]!;
      const pairKey = `${a.id}-${b.id}`;
      if (paired.has(pairKey)) continue;

      const matchReasons: string[] = [];
      let score = 0;

      const emailA = normalize(a.email);
      const emailB = normalize(b.email);
      if (emailA && emailB && emailA === emailB) {
        matchReasons.push("Same email");
        score += 50;
      }

      const phoneA = (a.phone ?? "").replace(/\D/g, "");
      const phoneB = (b.phone ?? "").replace(/\D/g, "");
      if (phoneA.length >= 8 && phoneB.length >= 8 && phoneA === phoneB) {
        matchReasons.push("Same phone");
        score += 40;
      }

      const nameA = normalize(a.name);
      const nameB = normalize(b.name);
      const nameSim = similarity(nameA, nameB);
      if (nameSim > 0.8) {
        matchReasons.push("Similar name");
        score += Math.round(nameSim * 20);
      }

      const compA = normalize(a.company);
      const compB = normalize(b.company);
      if (compA && compB) {
        const compSim = similarity(compA, compB);
        if (compSim > 0.8) {
          matchReasons.push("Similar company");
          score += Math.round(compSim * 10);
        }
      }

      if (score >= 40 && matchReasons.length > 0) {
        paired.add(pairKey);
        groups.push({
          leads: [a as DuplicateLeadEntry, b as DuplicateLeadEntry],
          matchReason: matchReasons,
          score: Math.min(score, 100),
        });
      }
    }
  }

  return groups.sort((a, b) => b.score - a.score);
}
