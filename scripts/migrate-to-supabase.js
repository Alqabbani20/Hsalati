#!/usr/bin/env node
/**
 * Migrate local data/users.json to Supabase.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { useSupabase } = require("../lib/supabase");

async function main() {
  if (!useSupabase()) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first");
    process.exit(1);
  }

  const dbPath = path.join(__dirname, "..", "data", "users.json");
  if (!fs.existsSync(dbPath)) {
    console.log("No local data/users.json found — nothing to migrate.");
    process.exit(0);
  }

  const local = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const { testConnection, findUserByUsername, createUser, addUserPlan } = require("../lib/db-supabase");

  await testConnection();
  console.log("Connected to Supabase");

  let migratedUsers = 0;
  let migratedPlans = 0;

  for (const u of local.users || []) {
    const existing = await findUserByUsername(u.username);
    if (existing) {
      console.log(`Skip user (exists): ${u.username}`);
      continue;
    }
    const created = await createUser(u.username, u.password_hash, u.role);
    migratedUsers++;
    console.log(`Migrated user: ${u.username} (id ${created.id})`);

    const plans = local.plans?.[String(u.id)] || local.plans?.[u.id] || [];
    const list = Array.isArray(plans) ? plans : [plans];
    for (const plan of list) {
      if (!plan || !plan.goal) continue;
      await addUserPlan(created.id, plan);
      migratedPlans++;
      console.log(`  → plan: ${plan.name}`);
    }
  }

  console.log(`Done. Migrated ${migratedUsers} users, ${migratedPlans} plans.`);
}

main().catch((err) => {
  console.error(err.message);
  if (err.hint) console.error("Hint:", err.hint);
  process.exit(1);
});
