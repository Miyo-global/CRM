
import { db } from "../lib/db";
import { users, organizationMembers, organizations } from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { assertNotProduction, assertLocalDatabase, generatePassword } from "./_guard";

const TEST_ACCOUNTS = [
  {
    email: "tarunchintakunta@gmail.com",
    firstName: "Tarun",
    lastName: "Chintakunta",
    role: "CEO",
    designation: "Chief Executive Officer",
  },
  {
    email: "chintakuntatarun@gmail.com",
    firstName: "Tarun",
    lastName: "HR",
    role: "HR",
    designation: "HR Manager",
  },
  {
    email: "prazithchinna1210@gmail.com",
    firstName: "Prazith",
    lastName: "Chinna",
    role: "SALES",
    designation: "Sales Representative",
  },
  {
    email: "prajitkumar1904@gmail.com",
    firstName: "Prajit",
    lastName: "Kumar",
    role: "CUSTOMER_SUPPORT",
    designation: "CRM Executive",
  },
  {
    email: "tarun@miyoglobal.com",
    firstName: "Tarun",
    lastName: "Marketing",
    role: "DIGITAL_MARKETING",
    designation: "Digital Marketing Lead",
  },
];

async function main() {
  assertNotProduction("seed-test-accounts");
  assertLocalDatabase("seed-test-accounts");

  const seeded: { email: string; password: string; role: string }[] = [];

  let org = await db.query.organizations.findFirst();
  if (!org) {
    const [newOrg] = await db.insert(organizations).values({
      id: nanoid(),
      name: "Miyo Global",
      slug: "miyo-global",
    }).returning();
    org = newOrg;
  }

  for (const account of TEST_ACCOUNTS) {
    const normalizedEmail = account.email.toLowerCase().trim();
    const plainPassword = process.env.SEED_PASSWORD || generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    seeded.push({ email: normalizedEmail, password: plainPassword, role: account.role });

    const existing = await db.query.users.findFirst({
      where: sql`lower(${users.email}) = ${normalizedEmail}`,
    });

    if (existing) {
      await db.update(users).set({
        password: hashedPassword,
        emailVerified: new Date(),
        isActive: true,
        isPasswordChangeRequired: false,
        loginAttempts: 0,
        lockedUntil: null,
        role: account.role,
        firstName: account.firstName,
        lastName: account.lastName,
        name: `${account.firstName} ${account.lastName}`,
        designation: account.designation,
        hasDashboardAccess: true,
      }).where(eq(users.id, existing.id));

      const membership = await db.query.organizationMembers.findFirst({
        where: sql`${organizationMembers.userId} = ${existing.id} AND ${organizationMembers.orgId} = ${org.id}`,
      });
      if (membership) {
        await db.update(organizationMembers)
          .set({ role: account.role })
          .where(eq(organizationMembers.id, membership.id));
      } else {
        await db.insert(organizationMembers).values({
          userId: existing.id,
          orgId: org.id,
          role: account.role,
        });
      }

    } else {
      const userId = nanoid();
      await db.insert(users).values({
        id: userId,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: new Date(),
        isActive: true,
        isPasswordChangeRequired: false,
        loginAttempts: 0,
        firstName: account.firstName,
        lastName: account.lastName,
        name: `${account.firstName} ${account.lastName}`,
        role: account.role,
        designation: account.designation,
        hasDashboardAccess: true,
        joiningDate: new Date().toISOString().split("T")[0],
      });

      await db.insert(organizationMembers).values({
        userId,
        orgId: org.id,
        role: account.role,
      });

    }
  }

  console.log("\nSeeded test accounts (store these securely — shown once):");
  for (const s of seeded) {
    console.log(`  ${s.role.padEnd(18)} ${s.email}  ${s.password}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
