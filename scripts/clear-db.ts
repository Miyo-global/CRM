import * as dotenv from "dotenv";
import * as readline from "readline";
dotenv.config({ path: ".env" });

async function main() {
  // Safety: block production usage
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: Cannot clear production database!");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.includes("neon.tech") || dbUrl.includes("supabase") || dbUrl.includes("amazonaws")) {
    console.error("FATAL: Refusing to truncate a cloud-hosted database.");
    console.error("Set ALLOW_CLEAR_REMOTE_DB=1 to override this safety check.");
    if (process.env.ALLOW_CLEAR_REMOTE_DB !== "1") {
      process.exit(1);
    }
  }

  // Interactive confirmation
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) =>
    rl.question("This will DELETE ALL DATA. Type 'DELETE ALL DATA' to confirm: ", resolve)
  );
  rl.close();

  if (answer !== "DELETE ALL DATA") {
    process.exit(1);
  }

  const { client } = await import("../lib/db");

  await client.unsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);

  process.exit(0);
}

main().catch((err) => {
  console.error("Clear DB failed:", err);
  process.exit(1);
});
