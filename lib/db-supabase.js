const bcrypt = require("bcryptjs");
const { getSupabase } = require("./supabase");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Alqabbani";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let adminReady = false;
let columnsEnsured = false;

function formatSupabaseError(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error.message === "string") return error.message;
  if (typeof error.details === "string") return error.details;
  if (typeof error.hint === "string") return error.hint;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function supabaseError(context, error) {
  const msg = formatSupabaseError(error);
  const code = error?.code;
  let hint;
  if (msg.includes("disabled_at")) {
    hint =
      "Run in Supabase SQL Editor: alter table public.users add column if not exists disabled_at timestamptz; notify pgrst, 'reload schema'; — or set SUPABASE_DB_URL and redeploy";
  } else if (msg.includes("does not exist") || msg.includes("relation") || code === "42P01" || code === "PGRST205") {
    hint = "Run supabase/schema.sql in Supabase SQL Editor, then click Check connection";
  } else if (code === "PGRST125" || msg.includes("Invalid path")) {
    hint = "Fix SUPABASE_URL in Vercel (use https://YOUR_PROJECT.supabase.co — not /rest/v1). Then run: NOTIFY pgrst, 'reload schema';";
  } else if (msg.includes("Invalid API key") || msg.includes("JWT")) {
    hint = "Check SUPABASE_SERVICE_ROLE_KEY in Vercel env vars (use the service_role secret, not anon)";
  }
  const err = new Error(`${context}: ${msg}`);
  err.hint = hint;
  err.code = code;
  throw err;
}

function rowToUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    password_hash: row.password_hash,
    role: row.role,
    disabled_at: row.disabled_at || null,
    created_at: row.created_at,
  };
}

function rowToPlan(row) {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    days: row.days,
    grid: row.grid,
    checked: row.checked || {},
    partials: row.partials || {},
    milestones_shown: row.milestones_shown || {},
    dailyTarget: Number(row.daily_target),
    created_at: row.created_at,
  };
}

async function findUserByUsernameRaw(username) {
  const supabase = getSupabase();
  const needle = username.trim();

  // Exact match first (avoids flaky ilike URL filters on some gateways)
  let { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", needle)
    .limit(1)
    .maybeSingle();

  if (error) supabaseError("User lookup failed", error);

  if (!data) {
    // Case-insensitive fallback without ilike operator in the path
    const listed = await supabase.from("users").select("*").limit(500);
    if (listed.error) supabaseError("User lookup failed", listed.error);
    const lower = needle.toLowerCase();
    data = (listed.data || []).find((u) => String(u.username).toLowerCase() === lower) || null;
  }

  return data ? rowToUser(data) : null;
}

async function ensureUserColumns() {
  if (columnsEnsured) return;
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    columnsEnsured = true;
    return;
  }
  try {
    const pg = require("pg");
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(
      "alter table public.users add column if not exists disabled_at timestamptz"
    );
    await client.query("notify pgrst, 'reload schema'");
    await client.end();
    console.log("Schema patch applied: users.disabled_at");
  } catch (err) {
    console.warn("Schema patch (disabled_at) skipped:", err.message);
  }
  columnsEnsured = true;
}

async function ensureAdminUser() {
  await ensureUserColumns();
  if (!ADMIN_PASSWORD || adminReady) return;
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  const existing = await findUserByUsernameRaw(ADMIN_USERNAME);

  const supabase = getSupabase();
  if (existing) {
    const { error } = await supabase
      .from("users")
      .update({ password_hash: hash, role: "admin", username: ADMIN_USERNAME })
      .eq("id", existing.id);
    if (error) supabaseError("Admin update failed", error);
  } else {
    const { error } = await supabase.from("users").insert({
      username: ADMIN_USERNAME,
      password_hash: hash,
      role: "admin",
    });
    if (error) supabaseError("Admin create failed", error);
  }
  adminReady = true;
}

async function testConnection() {
  await ensureUserColumns();
  const supabase = getSupabase();
  const tables = ["users", "savings_plans", "user_profiles", "save_events", "user_badges", "survey_responses", "activity_log"];
  const missing = [];

  for (const table of tables) {
    // Real SELECT (not head-only) so PGRST125 / schema-cache issues surface here
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      const msg = formatSupabaseError(error);
      const code = error.code;
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("Could not find the table") ||
        code === "42P01" ||
        code === "PGRST205" ||
        code === "PGRST125"
      ) {
        missing.push(table);
      } else {
        supabaseError("Database connection failed", error);
      }
    }
  }

  if (missing.length) {
    const err = new Error(`Missing or unreachable tables: ${missing.join(", ")}`);
    err.hint = "In Supabase SQL Editor run the schema, then: NOTIFY pgrst, 'reload schema';";
    throw err;
  }

  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  if (error) supabaseError("Database connection failed", error);
  return { ok: true, users: count ?? 0 };
}

async function findUserByUsername(username) {
  await ensureAdminUser();
  const user = await findUserByUsernameRaw(username);
  if (user?.disabled_at) return null;
  return user;
}

async function findUserById(id) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) supabaseError("User fetch failed", error);
  if (!data) return null;
  return {
    id: Number(data.id),
    username: data.username,
    role: data.role,
    created_at: data.created_at,
  };
}

async function getAllUsers() {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) supabaseError("List users failed", error);
  return (data || []).map((u) => ({
    id: Number(u.id),
    username: u.username,
    role: u.role,
    disabled_at: u.disabled_at || null,
    created_at: u.created_at,
  }));
}

async function createUser(username, passwordHash, role) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .insert({ username, password_hash: passwordHash, role })
    .select("id, username, role, created_at")
    .single();
  if (error) supabaseError("Create user failed", error);
  return {
    id: Number(data.id),
    username: data.username,
    role: data.role,
    created_at: data.created_at,
  };
}

async function deleteUser(id) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) supabaseError("Delete user failed", error);
}

async function getUserPlans(userId) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("savings_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) supabaseError("List plans failed", error);
  return (data || []).map(rowToPlan);
}

async function getUserPlanById(userId, planId) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("savings_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("id", planId)
    .maybeSingle();
  if (error) supabaseError("Plan fetch failed", error);
  return data ? rowToPlan(data) : null;
}

async function addUserPlan(userId, plan) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("savings_plans")
    .insert({
      id: plan.id,
      user_id: userId,
      name: plan.name,
      goal: plan.goal,
      days: plan.days,
      grid: plan.grid,
      checked: plan.checked || {},
      partials: plan.partials || {},
      milestones_shown: plan.milestones_shown || {},
      daily_target: plan.dailyTarget,
      created_at: plan.created_at,
    })
    .select("*")
    .single();
  if (error) supabaseError("Create plan failed", error);
  return rowToPlan(data);
}

async function updateUserPlan(userId, planId, updates) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const patch = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.goal !== undefined) patch.goal = updates.goal;
  if (updates.days !== undefined) patch.days = updates.days;
  if (updates.grid !== undefined) patch.grid = updates.grid;
  if (updates.checked !== undefined) patch.checked = updates.checked;
  if (updates.partials !== undefined) patch.partials = updates.partials;
  if (updates.milestones_shown !== undefined) patch.milestones_shown = updates.milestones_shown;
  if (updates.dailyTarget !== undefined) patch.daily_target = updates.dailyTarget;

  const { data, error } = await supabase
    .from("savings_plans")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", planId)
    .select("*")
    .maybeSingle();
  if (error) supabaseError("Update plan failed", error);
  return data ? rowToPlan(data) : null;
}

async function deleteUserPlanById(userId, planId) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { error } = await supabase
    .from("savings_plans")
    .delete()
    .eq("user_id", userId)
    .eq("id", planId);
  if (error) supabaseError("Delete plan failed", error);
}

async function updateUserPassword(id, passwordHash) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { error } = await supabase.from("users").update({ password_hash: passwordHash }).eq("id", id);
  if (error) supabaseError("Password update failed", error);
}

module.exports = {
  ensureAdminUser,
  ensureUserColumns,
  testConnection,
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  deleteUser,
  updateUserPassword,
  getUserPlans,
  getUserPlanById,
  addUserPlan,
  updateUserPlan,
  deleteUserPlanById,
};
