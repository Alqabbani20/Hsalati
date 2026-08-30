const bcrypt = require("bcryptjs");
const { getSupabase } = require("./supabase");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Alqabbani";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let adminReady = false;

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
  const hint = msg.includes("does not exist") || msg.includes("relation")
    ? "Run supabase/schema.sql in Supabase SQL Editor (Admin panel has copy button)"
    : msg.includes("Invalid API key") || msg.includes("JWT")
    ? "Check SUPABASE_SERVICE_ROLE_KEY in Vercel env vars"
    : undefined;
  const err = new Error(`${context}: ${msg}`);
  err.hint = hint;
  err.code = error?.code;
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
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", username.trim())
    .limit(1)
    .maybeSingle();
  if (error) supabaseError("User lookup failed", error);
  return data ? rowToUser(data) : null;
}

async function ensureAdminUser() {
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
  const supabase = getSupabase();
  const tables = ["users", "savings_plans", "user_profiles", "save_events", "user_badges", "survey_responses", "activity_log"];
  const missing = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      const msg = formatSupabaseError(error);
      if (msg.includes("does not exist") || msg.includes("relation") || error.code === "42P01") {
        missing.push(table);
      } else {
        supabaseError("Database connection failed", error);
      }
    }
  }

  if (missing.length) {
    const err = new Error(`Missing tables: ${missing.join(", ")}`);
    err.hint = "Open Admin panel → copy SQL → run in Supabase SQL Editor";
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
    .select("id, username, role, disabled_at, created_at")
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
