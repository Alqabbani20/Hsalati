#!/usr/bin/env node
/**
 * Apply supabase/schema.sql to your Supabase Postgres database.
 *
 * Set SUPABASE_DB_URL in .env (from Supabase Dashboard → Settings → Database → URI):
 *   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Missing SUPABASE_DB_URL in .env");
    console.error("Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)");
    process.exit(1);
  }

  let pg;
  try {
    pg = require("pg");
  } catch {
    console.error("Run: npm install pg");
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "supabase", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected to Supabase Postgres");

  try {
    await client.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
