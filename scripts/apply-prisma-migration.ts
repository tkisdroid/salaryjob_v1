import { config as loadEnv } from "dotenv";
import * as fs from "node:fs";
import { Client } from "pg";

loadEnv({ path: ".env.local", override: true });
loadEnv();

const file = process.argv[2];
if (!file) {
  throw new Error("Usage: npx tsx scripts/apply-prisma-migration.ts <migration.sql>");
}

const connectionString = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required.");
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 60_000,
});

async function main() {
  const sql = fs.readFileSync(file, "utf8");
  await client.connect();
  console.log(`Connected with ${process.env["DIRECT_URL"] ? "DIRECT_URL" : "DATABASE_URL"}.`);
  await client.query("SET statement_timeout = '60s'");
  await client.query(sql);
  await client.end();
  console.log(`Applied ${file}`);
}

main().catch(async (error) => {
  try {
    await client.end();
  } catch {
    // ignore disconnect failures
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
