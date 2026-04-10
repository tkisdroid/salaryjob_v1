/**
 * scripts/apply-supabase-migrations.ts
 *
 * Applies supabase/migrations/*.sql files in lexicographic order against DIRECT_URL.
 * Replaces `supabase db push` (which requires Supabase CLI + Docker) in the direct-prisma
 * strategy chosen in Plan 02-01 Task 5 checkpoint resolution.
 *
 * Usage:
 *   npx tsx scripts/apply-supabase-migrations.ts
 *   npm run db:supabase
 *
 * Requires:
 *   - DIRECT_URL in .env.local (port 5432, not pooler)
 *   - pg tables must already exist (run prisma db push first)
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

async function main(): Promise<void> {
  const directUrl = process.env["DIRECT_URL"];
  if (!directUrl) {
    throw new Error(
      "DIRECT_URL environment variable is required. Set it in .env.local."
    );
  }

  // Read all .sql files in lexicographic order
  const sqlFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (sqlFiles.length === 0) {
    console.log("No SQL migration files found in supabase/migrations/");
    return;
  }

  console.log(`Found ${sqlFiles.length} Supabase migration(s) to apply:`);
  sqlFiles.forEach((f) => console.log(`  - ${f}`));

  const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false }, // Supabase uses Let's Encrypt certs
  });

  await client.connect();
  console.log("\nConnected to database.\n");

  // Create migration tracking table if it doesn't exist
  await client.query(`
    CREATE TABLE IF NOT EXISTS _supabase_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Get already-applied migrations
  const applied = await client.query<{ filename: string }>(
    "SELECT filename FROM _supabase_migrations"
  );
  const appliedSet = new Set(applied.rows.map((r) => r.filename));

  let skipped = 0;
  let executed = 0;

  // Apply each file in its own statement block (not single transaction — DDL like
  // CREATE EXTENSION and ALTER TABLE ... ENABLE ROW LEVEL SECURITY require autocommit
  // semantics in some cases).
  for (const filename of sqlFiles) {
    if (appliedSet.has(filename)) {
      console.log(`Skipping (already applied): ${filename}`);
      skipped++;
      continue;
    }

    const filepath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filepath, "utf-8");

    console.log(`Applying: ${filename}`);
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO _supabase_migrations (filename) VALUES ($1)",
        [filename]
      );
      console.log(`  OK\n`);
      executed++;
    } catch (err) {
      await client.end();
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed applying ${filename}: ${message}`);
    }
  }

  await client.end();
  console.log(
    `Done. ${executed} applied, ${skipped} skipped (already applied).`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
