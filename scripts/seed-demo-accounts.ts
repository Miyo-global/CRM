





import { db } from "../lib/db";
import { organizations } from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { assertNotProduction, assertLocalDatabase } from "./_guard";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "Demo@1234";

const DEMO_ACCOUNTS = [
  { email: "demo.ceo@miyoglobal.demo",             firstName: "Demo", lastName: "CEO",            role: "CEO",              designation: "Chief Executive Officer",       branchScoped: false },
  { email: "demo.hr@miyoglobal.demo",              firstName: "Demo", lastName: "HR",             role: "HR",               designation: "HR Manager",                    branchScoped: false },
  { email: "demo.admin@miyoglobal.demo",           firstName: "Demo", lastName: "Admin",          role: "ADMIN",            designation: "System Administrator",          branchScoped: false },
  { email: "demo.sales@miyoglobal.demo",           firstName: "Demo", lastName: "Sales",          role: "SALES",            designation: "Sales Representative",          branchScoped: false },
  { email: "demo.engineering@miyoglobal.demo",     firstName: "Demo", lastName: "Engineer",       role: "ENGINEERING",      designation: "Software Engineer",             branchScoped: false },
  { email: "demo.design@miyoglobal.demo",          firstName: "Demo", lastName: "Designer",       role: "DESIGN",           designation: "UI/UX Designer",                branchScoped: false },
  { email: "demo.support@miyoglobal.demo",         firstName: "Demo", lastName: "Support",        role: "CUSTOMER_SUPPORT", designation: "Customer Support Executive",     branchScoped: false },
  { email: "demo.videoeditor@miyoglobal.demo",     firstName: "Demo", lastName: "VideoEditor",    role: "VIDEO_EDITOR",     designation: "Video Editor",                  branchScoped: false },
  { email: "demo.marketing@miyoglobal.demo",       firstName: "Demo", lastName: "Marketing",      role: "DIGITAL_MARKETING",designation: "Digital Marketing Specialist",  branchScoped: false },
  { email: "demo.branchmanager@miyoglobal.demo",   firstName: "Demo", lastName: "BranchManager",  role: "BRANCH_MANAGER",   designation: "Branch Manager",                branchScoped: true  },
  { email: "demo.branchhr@miyoglobal.demo",        firstName: "Demo", lastName: "BranchHR",       role: "BRANCH_HR",        designation: "Branch HR Executive",           branchScoped: true  },
];

async function main() {
  assertNotProduction("seed-demo-accounts");
  assertLocalDatabase("seed-demo-accounts");

  const orgSlug = process.env.SEED_ORG_SLUG ?? "miyo-global";
  let org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) {
    const orgId = nanoid();
    await db.execute(
      sql`INSERT INTO organizations (id, name, slug, created_at, updated_at)
          VALUES (${orgId}, ${"Miyo Global"}, ${orgSlug}, now(), now())
          ON CONFLICT (slug) DO NOTHING`
    );
    org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
      columns: { id: true, name: true },
    });
  }

  if (!org) {
    throw new Error(`Failed to resolve organization with slug "${orgSlug}"`);
  }

  const orgId = org.id;
  console.log(`Using organization: ${org.name} (${orgSlug})`);

  let firstBranchId: number | null = null;
  try {
    const branch = await db.execute<{ id: number }>(
      sql`SELECT id FROM branches WHERE org_id = ${orgId} LIMIT 1`
    );
    const branchRow = Array.isArray(branch) ? branch[0] : (branch as { rows?: { id: number }[] }).rows?.[0];
    firstBranchId = branchRow?.id ?? null;
  } catch {
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const today = new Date().toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    for (const account of DEMO_ACCOUNTS) {
      const userId = nanoid();
      const branchId = account.branchScoped ? firstBranchId : null;
      const fullName = `${account.firstName} ${account.lastName}`;

      const upsertResult = await tx.execute<{ id: string }>(
        sql`
          INSERT INTO users (
            id, email, password, email_verified, is_active, is_password_change_required,
            login_attempts, first_name, last_name, name, role, designation,
            has_dashboard_access, joining_date, branch_id, created_at, updated_at
          ) VALUES (
            ${userId}, ${account.email}, ${hashedPassword}, now(), true, false,
            0, ${account.firstName}, ${account.lastName}, ${fullName}, ${account.role},
            ${account.designation}, true, ${today}, ${branchId}, now(), now()
          )
          ON CONFLICT (email) DO UPDATE SET
            password                  = EXCLUDED.password,
            email_verified            = now(),
            is_active                 = true,
            is_password_change_required = false,
            login_attempts            = 0,
            locked_until              = null,
            first_name                = EXCLUDED.first_name,
            last_name                 = EXCLUDED.last_name,
            name                      = EXCLUDED.name,
            role                      = EXCLUDED.role,
            designation               = EXCLUDED.designation,
            has_dashboard_access      = true,
            branch_id                 = EXCLUDED.branch_id,
            updated_at                = now()
          RETURNING id
        `
      );

      const row = Array.isArray(upsertResult) ? upsertResult[0] : (upsertResult as { rows?: { id: string }[] }).rows?.[0];
      const actualUserId: string = (row as { id?: string } | undefined)?.id ?? userId;

      await tx.execute(
        sql`
          DELETE FROM organization_members
          WHERE user_id = ${actualUserId} AND org_id != ${orgId}
        `
      );

      await tx.execute(
        sql`
          INSERT INTO organization_members (user_id, org_id, role, joined_at)
          VALUES (${actualUserId}, ${orgId}, ${account.role}, now())
          ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
        `
      );
    }
  });

  console.log(`\nSeeded ${DEMO_ACCOUNTS.length} demo accounts.`);
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
