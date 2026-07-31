import postgres from "postgres";
import bcrypt from "bcryptjs";

const url = process.env.PROD_DATABASE_URL;
const email = process.env.TARGET_EMAIL;
const newPassword = process.env.NEW_PASSWORD;

if (!url || !email || !newPassword) {
  console.error("Missing PROD_DATABASE_URL / TARGET_EMAIL / NEW_PASSWORD");
  process.exit(1);
}

function normalize(u: string): string {
  if (!/\.neon\.tech/i.test(u)) return u;
  try {
    const parsed = new URL(u);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return u;
  }
}

const sql = postgres(normalize(url), {
  prepare: false,
  ssl: "require",
  max: 1,
  connect_timeout: 60,
});

async function main() {
  const before = await sql`
    select id, name, email, is_active, email_verified, locked_until, login_attempts
    from users where email = ${email!}
  `;

  if (before.length === 0) {
    console.error(`No user found with email ${email}`);
    await sql.end();
    process.exit(2);
  }
  console.log("BEFORE:", before[0]);

  const hash = await bcrypt.hash(newPassword!, 12);

  const updated = await sql`
    update users set
      password = ${hash},
      email_verified = coalesce(email_verified, now()),
      is_password_change_required = false,
      locked_until = null,
      login_attempts = 0,
      password_changed_at = now()
    where email = ${email!}
    returning id, email, is_active, email_verified, locked_until, login_attempts
  `;

  console.log("ROWS UPDATED:", updated.length);
  console.log("AFTER:", updated[0]);
  console.log("bcrypt self-check:", await bcrypt.compare(newPassword!, hash));

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sql.end();
  } catch {}
  process.exit(1);
});
