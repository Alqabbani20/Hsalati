const bcrypt = require("bcryptjs");
const { getSupabase } = require("./supabase");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Alqabbani";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let adminReady = false;

function rowToUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    password_hash: row.password_hash,
    role: row.role,
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
    dailyTarget: Number(row.daily_target),
    created_at: row.created_at,
  };
}

async function ensureAdminUser() {
  if (!ADMIN_PASSWORD || adminReady) return;
  const supabase = getSupabase();
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  const { data: existing, error: findErr } = await supabase
    .from("users")
    .select("id, username")
    .ilike("username", ADMIN_USERNAME)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing) {
    const { error } = await supabase
      .from("users")
      .update({ password_hash: hash, role: "admin", username: ADMIN_USERNAME })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("users").insert({
      username: ADMIN_USERNAME,
      password_hash: hash,
      role: "admin",
    });
    if (error) throw error;
  }

  adminReady = true;
}

async function findUserByUsername(username) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("username", username.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? rowToUser(data) : null;
}

async function findUserById(id) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
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
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((u) => ({
    id: Number(u.id),
    username: u.username,
    role: u.role,
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
  if (error) throw error;
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
  if (error) throw error;
}

async function getUserPlans(userId) {
  await ensureAdminUser();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("savings_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
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
  if (error) throw error;
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
      daily_target: plan.dailyTarget,
      created_at: plan.created_at,
    })
    .select("*")
    .single();
  if (error) throw error;
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
  if (updates.dailyTarget !== undefined) patch.daily_target = updates.dailyTarget;

  const { data, error } = await supabase
    .from("savings_plans")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", planId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
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
  if (error) throw error;
}

module.exports = {
  ensureAdminUser,
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  deleteUser,
  getUserPlans,
  getUserPlanById,
  addUserPlan,
  updateUserPlan,
  deleteUserPlanById,
};
