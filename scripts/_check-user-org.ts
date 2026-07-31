import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  const { db, client } = await import("../lib/db");
  const { users, organizationMembers, organizations } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");
  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, "chintakuntatarun@gmail.com") });
    console.log("user:", user?.id, user?.email, user?.name);

    if (user) {
      const memberships = await db.query.organizationMembers.findMany({
        where: eq(organizationMembers.userId, user.id),
      });
      console.log("memberships:", memberships.map(m => m.orgId));

      const orgs = await db.query.organizations.findMany();
      console.log("all orgs:", orgs.map(o => `${o.id} (${o.slug})`));
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}
main().catch(console.error);
