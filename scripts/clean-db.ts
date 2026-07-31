import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { assertNotProduction, assertLocalDatabase, confirmDestructive } from "./_guard";

async function clean() {
  assertNotProduction("clean-db");
  assertLocalDatabase("clean-db", "ALLOW_CLEAR_REMOTE_DB");
  await confirmDestructive("DELETE ALL DATA");

  const { client } = await import("../lib/db");

  await client.unsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  process.exit(0);
}

clean().catch((e) => {
  console.error(e);
  process.exit(1);
});


