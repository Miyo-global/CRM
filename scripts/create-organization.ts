import { db } from "../lib/db";
import { organizations, organizationMembers, users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function createOrganization(
  name: string,
  slug: string,
  ownerEmail: string
) {
  try {
    const owner = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!owner) {
      throw new Error(`User with email ${ownerEmail} not found`);
    }
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      throw new Error(`Organization with slug "${slug}" already exists`);
    }
    const orgId = nanoid();
    await db.insert(organizations).values({
      id: orgId,
      name,
      slug,
    });
    await db.insert(organizationMembers).values({
      userId: owner.id,
      orgId,
      role: "CEO",
    });

    return { id: orgId, name, slug };
  } catch (error) {
    throw error;
  }
}
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/create-organization.ts \"Organization Name\" \"org-slug\" \"owner-email\"");
    process.exit(1);
  }

  const [name, slug, ownerEmail] = args;
  const finalOwnerEmail = ownerEmail || process.env.OWNER_EMAIL;

  if (!finalOwnerEmail) {
    console.error("Owner email is required");
    process.exit(1);
  }

  createOrganization(name, slug, finalOwnerEmail)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to create organization:");
      console.error(error.message || error);
      process.exit(1);
    });
}

export { createOrganization };
