
import * as dotenv from "dotenv";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
dotenv.config({ path: ".env" });

async function main() {
  const { db } = await import("../lib/db");
  const { users, organizations, organizationMembers, departments, roles, leaveTypes } = await import("../lib/db/schema");
  const { ROLE_DEFAULT_PERMISSIONS } = await import("../lib/rbac/permissions");
  const { DEFAULT_LEAVE_TYPES } = await import("../lib/leave-policy");
  const { eq, and } = await import("drizzle-orm");

  const password = "Tarun@1234";
  const passwordHash = await hash(password, 12);

  // ─── Organization ───
  let orgId = "org_" + nanoid();
  const existingOrg = await db.query.organizations.findFirst({
    where: (orgs, { eq }) => eq(orgs.slug, "miyo-global"),
  });

  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    await db.insert(organizations).values({
      id: orgId,
      name: "Miyo Global",
      slug: "miyo-global",
    });
  }

  // ─── CEO Account (single account) ───
  const adminEmail = "tarunchintakunta@gmail.com";
  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, adminEmail),
  });

  let adminUserId: string;
  if (existingAdmin) {
    adminUserId = existingAdmin.id;
    await db.update(users).set({
      name: "Tarun Chintakunta",
      firstName: "Tarun",
      lastName: "Chintakunta",
      password: passwordHash,
      role: "CEO",
      isActive: true,
      hasDashboardAccess: true,
      isPasswordChangeRequired: false,
      emailVerified: new Date(),
    }).where(eq(users.id, adminUserId));
  } else {
    adminUserId = "user_" + nanoid();
    await db.insert(users).values({
      id: adminUserId,
      email: adminEmail,
      name: "Tarun Chintakunta",
      firstName: "Tarun",
      lastName: "Chintakunta",
      password: passwordHash,
      role: "CEO",
      emailVerified: new Date(),
      isActive: true,
      hasDashboardAccess: true,
      isPasswordChangeRequired: false,
    });
  }

  // Clean up any duplicate org memberships for this user
  await db.delete(organizationMembers).where(
    and(eq(organizationMembers.userId, adminUserId), eq(organizationMembers.orgId, orgId))
  );
  await db.insert(organizationMembers).values({
    userId: adminUserId,
    orgId,
    role: "CEO",
  });

  // ─── Clean up stale demo accounts ───
  const staleEmails = ["admin@miyoglobal.demo", "hr@miyoglobal.demo"];
  for (const email of staleEmails) {
    const stale = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });
    if (stale) {
      await db.delete(organizationMembers).where(eq(organizationMembers.userId, stale.id));
      await db.delete(users).where(eq(users.id, stale.id));
    }
  }

  // ─── Departments (clean + re-insert to avoid duplicates) ───
  await db.delete(departments).where(eq(departments.orgId, orgId));
  const departmentList = [
    "Engineering", "Design", "Digital Marketing", "Sales",
    "Finance", "Operations", "Customer Support", "Administration",
  ];
  for (const deptName of departmentList) {
    await db.insert(departments).values({ orgId, name: deptName });
  }

  // ─── System Roles (clean + re-insert to avoid duplicates) ───
  await db.delete(roles).where(eq(roles.orgId, orgId));
  const systemRoles = [
    { name: "CEO", slug: "CEO" },
    { name: "HR", slug: "HR" },
    { name: "Sales", slug: "SALES" },
    { name: "Customer Support", slug: "CUSTOMER_SUPPORT" },
    { name: "Engineering", slug: "ENGINEERING" },
    { name: "Design", slug: "DESIGN" },
    { name: "Video Editor", slug: "VIDEO_EDITOR" },
    { name: "Digital Marketing", slug: "DIGITAL_MARKETING" },
  ];
  for (const role of systemRoles) {
    await db.insert(roles).values({
      name: role.name,
      slug: role.slug,
      orgId,
      isSystem: true,
      permissions: ROLE_DEFAULT_PERMISSIONS[role.slug] || [],
    });
  }

  // ─── Leave Types (clean + re-insert) ───
  await db.delete(leaveTypes).where(eq(leaveTypes.orgId, orgId));
  for (const lt of DEFAULT_LEAVE_TYPES) {
    await db.insert(leaveTypes).values({
      orgId,
      name: lt.name,
      daysPerYear: lt.daysPerYear,
      carryForward: lt.carryForward,
    });
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
