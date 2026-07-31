import * as dotenv from "dotenv";
import { HR_LETTER_DEFAULT_BODIES, HR_LETTER_DOCUMENT_TYPES, HR_LETTER_TYPE_TITLES } from "../lib/hr/hr-letter-tokens";

dotenv.config({ path: ".env" });

const SKIP_TYPES = new Set(["OFFER_LETTER"]);

async function main() {
  const { db, client } = await import("../lib/db");
  const { offerLetterTemplates } = await import("../lib/db/schema");
  const { and, eq } = await import("drizzle-orm");

  try {
    const orgSlug = process.env.SEED_ORG_SLUG ?? "miyo-global";
    const org =
      (await db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.slug, orgSlug) })) ??
      (await db.query.organizations.findFirst());

    if (!org) throw new Error("No organisation found. Seed org first.");

    let inserted = 0;
    let updated = 0;

    for (const { value: docType, label } of HR_LETTER_DOCUMENT_TYPES) {
      if (SKIP_TYPES.has(docType)) continue;

      const body = HR_LETTER_DEFAULT_BODIES[docType];
      if (!body) {
        console.log(`skip (no body): ${docType}`);
        continue;
      }

      const name = label;
      const title = HR_LETTER_TYPE_TITLES[docType] ?? label;
      const showSignatureBlock = docType === "TERMINATION";

      const existing = await db.query.offerLetterTemplates.findFirst({
        where: and(
          eq(offerLetterTemplates.orgId, org.id),
          eq(offerLetterTemplates.name, name),
        ),
      });

      if (existing) {
        await db
          .update(offerLetterTemplates)
          .set({ body, documentType: docType, showSignatureBlock, updatedAt: new Date() })
          .where(and(eq(offerLetterTemplates.id, existing.id), eq(offerLetterTemplates.orgId, org.id)));
        updated++;
        console.log(`updated: ${name}`);
        continue;
      }

      await db.insert(offerLetterTemplates).values({
        orgId: org.id,
        name,
        body,
        documentType: docType,
        showSignatureBlock,
      });
      inserted++;
      console.log(`inserted: ${name}`);
    }

    console.log(`\nDone. inserted=${inserted} updated=${updated}`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
