import dotenv from "dotenv";
import { execSync } from "child_process";
import { Client } from "pg";

// load environment variables so DATABASE_URL is set
dotenv.config();

/**
 * This script performs two jobs:
 *
 * 1. Connect to the Postgres database defined by DATABASE_URL and drop the
 *    legacy unique constraint/index that included `isActive` on
 *    ChannelBinding. This index used to cause P2002 errors when toggling a
 *    binding off and then on again.
 * 2. Execute `npm run db:push` which mirrors the current `prisma/schema.prisma`
 *    into the database. That will create the QRCode table and add the
 *    non-unique indexes we desire.
 *
 * You can run it with:
 *
 *   npx tsx scripts/sync-db.ts
 *
 * or via the new npm script `npm run db:sync`.
 */

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not defined in environment");
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    console.log("[*] connecting to database");
    await client.connect();

    console.log("[*] dropping legacy ChannelBinding unique index (if present)");
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename='\"ChannelBinding\"'
            AND indexdef ILIKE '%isActive%'
        ) THEN
          ALTER TABLE "ChannelBinding"
            DROP CONSTRAINT IF EXISTS "ChannelBinding_channelType_senderIdentifier_isActive_key";
          DROP INDEX IF EXISTS "ChannelBinding_channelType_senderIdentifier_isActive_key";
        END IF;
      END
      $$;
    `);

    console.log("[*] running prisma db push to sync schema");
    execSync("npm run db:push", { stdio: "inherit" });

    console.log("✅ database push complete");
  } catch (err) {
    console.error("Error during schema sync:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
