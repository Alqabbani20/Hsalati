const crypto = require("crypto");
const { getSupabase, useSupabase } = require("./supabase");
const { readDb, saveDb } = require("./db");

function sb() { return getSupabase(); }

function supabaseError(ctx, error) {
  const err = new Error(`${ctx}: ${error?.message || error}`);
  err.hint = error?.message?.includes("does not exist") ? "Run supabase/schema.sql" : undefined;
  throw err;
}

async function logActivity(userId, action, details = {}) {
  if (useSupabase()) {
    const { error } = await sb().from("activity_log").insert({ user_id: userId, action, details });
    if (error) supabaseError("Activity log failed", error);
    return;
  }
  const db = await readDb();
  if (!db.activity_log) db.activity_log = [];
  db.activity_log.unshift({ id: crypto.randomUUID(), user_id: userId, action, details, created_at: new Date().toISOString() });
  db.activity_log = db.activity_log.slice(0, 500);
  await saveDb(db);
}

async function recordSaveEvent(userId, planId, amount, cellKey, eventType) {
  if (useSupabase()) {
    const { error } = await sb().from("save_events").insert({ user_id: userId, plan_id: planId, amount, cell_key: cellKey || null, event_type: eventType });
    if (error) supabaseError("Save event failed", error);
    return;
  }
  const db = await readDb();
  if (!db.save_events) db.save_events = [];
  db.save_events.push({ id: crypto.randomUUID(), user_id: userId, plan_id: planId, amount, cell_key: cellKey, event_type: eventType, created_at: new Date().toISOString() });
  await saveDb(db);
}

async function getSaveEvents(userId, limit = 500) {
  if (useSupabase()) {
    const { data, error } = await sb().from("save_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    if (error) supabaseError("Load events failed", error);
    return data || [];
  }
  const db = await readDb();
  return (db.save_events || []).filter((e) => e.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

async function getProfile(userId) {
  if (useSupabase()) {
    const { data, error } = await sb().from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) supabaseError("Profile load failed", error);
    return data || { user_id: userId, onboarding_completed: false };
  }
  const db = await readDb();
  return (db.profiles || {})[String(userId)] || { onboarding_completed: false };
}

async function updateProfile(userId, patch) {
  if (useSupabase()) {
    const { error } = await sb().from("user_profiles").upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() });
    if (error) supabaseError("Profile update failed", error);
    return;
  }
  const db = await readDb();
  if (!db.profiles) db.profiles = {};
  db.profiles[String(userId)] = { ...(db.profiles[String(userId)] || {}), ...patch, updated_at: new Date().toISOString() };
  await saveDb(db);
}

async function getUserBadges(userId) {
  if (useSupabase()) {
    const { data, error } = await sb().from("user_badges").select("badge_id, earned_at").eq("user_id", userId);
    if (error) supabaseError("Badges load failed", error);
    return data || [];
  }
  const db = await readDb();
  return (db.user_badges || []).filter((b) => b.user_id === userId).map((b) => ({ badge_id: b.badge_id, earned_at: b.earned_at }));
}

async function awardBadges(userId, badgeIds) {
  if (!badgeIds.length) return;
  if (useSupabase()) {
    const rows = badgeIds.map((badge_id) => ({ user_id: userId, badge_id }));
    const { error } = await sb().from("user_badges").upsert(rows, { onConflict: "user_id,badge_id" });
    if (error) supabaseError("Award badges failed", error);
    return;
  }
  const db = await readDb();
  if (!db.user_badges) db.user_badges = [];
  badgeIds.forEach((badge_id) => {
    if (!db.user_badges.some((b) => b.user_id === userId && b.badge_id === badge_id)) {
      db.user_badges.push({ user_id: userId, badge_id, earned_at: new Date().toISOString() });
    }
  });
  await saveDb(db);
}

async function submitSurvey(userId, answers) {
  if (useSupabase()) {
    const { error } = await sb().from("survey_responses").insert({ user_id: userId, answers });
    if (error) supabaseError("Survey failed", error);
    return;
  }
  const db = await readDb();
  if (!db.survey_responses) db.survey_responses = [];
  db.survey_responses.push({ id: crypto.randomUUID(), user_id: userId, answers, created_at: new Date().toISOString() });
  await saveDb(db);
}

async function hasSurveyResponse(userId) {
  if (useSupabase()) {
    const { count, error } = await sb().from("survey_responses").select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (error) supabaseError("Survey check failed", error);
    return (count || 0) > 0;
  }
  const db = await readDb();
  return (db.survey_responses || []).some((s) => s.user_id === userId);
}

async function getActivityLog(limit = 100) {
  if (useSupabase()) {
    const { data, error } = await sb().from("activity_log").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) supabaseError("Activity load failed", error);
    const users = {};
    if (data?.length) {
      const ids = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
      const { data: urows } = await sb().from("users").select("id, username").in("id", ids);
      (urows || []).forEach((u) => { users[u.id] = u.username; });
    }
    return (data || []).map((r) => ({ ...r, username: users[r.user_id] }));
  }
  const db = await readDb();
  const users = Object.fromEntries((db.users || []).map((u) => [u.id, u.username]));
  return (db.activity_log || []).slice(0, limit).map((r) => ({ ...r, username: users[r.user_id] }));
}

async function disableUser(id) {
  if (useSupabase()) {
    const { error } = await sb().from("users").update({ disabled_at: new Date().toISOString() }).eq("id", id);
    if (error) supabaseError("Disable user failed", error);
    return;
  }
  const db = await readDb();
  const u = db.users.find((x) => x.id === id);
  if (u) u.disabled_at = new Date().toISOString();
  await saveDb(db);
}

async function enableUser(id) {
  if (useSupabase()) {
    const { error } = await sb().from("users").update({ disabled_at: null }).eq("id", id);
    if (error) supabaseError("Enable user failed", error);
    return;
  }
  const db = await readDb();
  const u = db.users.find((x) => x.id === id);
  if (u) delete u.disabled_at;
  await saveDb(db);
}

module.exports = {
  logActivity, recordSaveEvent, getSaveEvents, getProfile, updateProfile,
  getUserBadges, awardBadges, submitSurvey, hasSurveyResponse, getActivityLog, disableUser, enableUser,
};
