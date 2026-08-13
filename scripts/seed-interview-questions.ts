import * as dotenv from "dotenv";

import { INTERVIEW_QUESTION_BANK_SEED } from "./data/interview-question-bank";

dotenv.config({ path: ".env" });

async function main() {
  const { db, client } = await import("../lib/db");
  const { interviewQuestions, organizations, users } = await import("../lib/db/schema");
  const { and, eq } = await import("drizzle-orm");

  try {
    const orgSlug = process.env.SEED_ORG_SLUG ?? "miyo-global";
    const org =
      (await db.query.organizations.findFirst({
        where: (o, { eq: e }) => e(o.slug, orgSlug),
      })) ?? (await db.query.organizations.findFirst());

    if (!org) {
      throw new Error("No organization found. Seed org first.");
    }

    const creatorEmail = process.env.SEED_CREATED_BY_EMAIL ?? process.env.TEST_EMAIL_TO;
    const creator =
      (creatorEmail
        ? await db.query.users.findFirst({ where: (u, { eq: e }) => e(u.email, creatorEmail) })
        : null) ??
      (await db.query.users.findFirst({ orderBy: (u, { desc }) => desc(u.createdAt) }));

    const createdBy = creator?.id ?? null;

    let inserted = 0;
    let skipped = 0;

    for (const q of INTERVIEW_QUESTION_BANK_SEED) {
      const existing = await db.query.interviewQuestions.findFirst({
        where: and(
          eq(interviewQuestions.orgId, org.id),
          eq(interviewQuestions.question, q.question),
          eq(interviewQuestions.category, q.category),
        ),
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await db.insert(interviewQuestions).values({
        orgId: org.id,
        question: q.question,
        category: q.category,
        role: q.role ?? null,
        difficulty: q.difficulty,
        tags: q.tags,
        createdBy: createdBy ?? undefined,
      });
      inserted += 1;
    }

    const byCategory = INTERVIEW_QUESTION_BANK_SEED.reduce<Record<string, number>>((acc, q) => {
      acc[q.category] = (acc[q.category] ?? 0) + 1;
      return acc;
    }, {});

    // eslint-disable-next-line no-console
    console.log(
      `Seeded interview question bank for org=${org.slug ?? org.id}. inserted=${inserted} skipped=${skipped} total=${INTERVIEW_QUESTION_BANK_SEED.length}`,
    );
    // eslint-disable-next-line no-console
    console.log("Per category:", byCategory);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
