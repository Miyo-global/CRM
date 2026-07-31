import "dotenv/config";
import { db } from "@/lib/db";
import { organizations, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  backfillConvertedLeadsToClientAccounts,
  backfillCrmAssignments,
} from "@/server/queries/crm-clients";

async function main() {
  const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
  console.log(`Backfilling ${orgs.length} organizations.`);

  let totalErrors = 0;
  for (const org of orgs) {
    const owner = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.orgId, org.id), eq(organizationMembers.role, "CEO")),
    });
    const fallbackUserId = owner?.userId;
    if (!fallbackUserId) {
      console.warn(`  [${org.id}] ${org.name} — no CEO member, skipping converted-leads backfill`);
    } else {
      try {
        await backfillConvertedLeadsToClientAccounts(org.id, fallbackUserId);
      } catch (e) {
        totalErrors++;
        console.error(`  [${org.id}] convertedLeads error:`, e);
      }
    }
    try {
      await backfillCrmAssignments(org.id);
    } catch (e) {
      totalErrors++;
      console.error(`  [${org.id}] crmAssignments error:`, e);
    }
    console.log(`  [${org.id}] ${org.name} — done`);
  }

  console.log(`Finished. Errors: ${totalErrors}`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
