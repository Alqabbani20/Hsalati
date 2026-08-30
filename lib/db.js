const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Alqabbani";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const BLOB_NAME = "hsalati-db.json";
const REDIS_KEY = "hsalati-db";

const dataDir = process.env.VERCEL
  ? os.tmpdir()
  : path.join(__dirname, "..", "data");

const dbPath = path.join(dataDir, "users.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let cache = null;
let blobModule = null;
let redisClient = null;

function storageMode() {
  if (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) return "redis";
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return "blob";
  if (!process.env.VERCEL) return "file";
  return "ephemeral";
}

function isPersistentStorage() {
  const mode = storageMode();
  return mode === "redis" || mode === "blob" || mode === "file";
}

function getRedis() {
  if (!redisClient) {
    const { Redis } = require("@upstash/redis");
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    redisClient = url && token ? new Redis({ url, token }) : Redis.fromEnv();
  }
  return redisClient;
}

async function getBlob() {
  if (!blobModule) {
    blobModule = require("@vercel/blob");
  }
  return blobModule;
}

async function readFromRedis() {
  try {
    const data = await getRedis().get(REDIS_KEY);
    return data || null;
  } catch (err) {
    console.error("Redis read failed:", err.message);
    return null;
  }
}

async function writeToRedis(db) {
  await getRedis().set(REDIS_KEY, db);
}

async function readFromBlob() {
  try {
    const { list } = await getBlob();
    const { blobs } = await list({ prefix: BLOB_NAME, limit: 10 });
    if (!blobs.length) return null;
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const res = await fetch(blobs[0].downloadUrl || blobs[0].url);
    if (!res.ok) return null;
    return JSON.parse(await res.text());
  } catch (err) {
    console.error("Blob read failed:", err.message);
    return null;
  }
}

async function writeToBlob(db) {
  const { put } = await getBlob();
  await put(BLOB_NAME, JSON.stringify(db, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function readFromFile() {
  if (!fs.existsSync(dbPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return null;
  }
}

function writeToFile(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function readRawDb() {
  const mode = storageMode();
  if (mode === "redis") return readFromRedis();
  if (mode === "blob") return readFromBlob();
  return readFromFile();
}

async function writeRawDb(db) {
  const mode = storageMode();
  if (mode === "redis") {
    await writeToRedis(db);
    return;
  }
  if (mode === "blob") {
    await writeToBlob(db);
    return;
  }
  writeToFile(db);
  if (mode === "ephemeral") {
    console.warn("WARNING: Using temporary storage on Vercel — users will NOT persist. Connect Vercel Blob or Upstash Redis.");
  }
}

function defaultDb() {
  const users = [];
  if (ADMIN_PASSWORD) {
    users.push({
      id: 1,
      username: ADMIN_USERNAME,
      password_hash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      role: "admin",
      created_at: new Date().toISOString(),
    });
  }
  return { nextId: users.length + 1, users, plans: {} };
}

function ensureAdminUser(db) {
  if (!ADMIN_PASSWORD) return db;
  if (!db.plans) db.plans = {};

  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  const adminLower = ADMIN_USERNAME.toLowerCase();
  let admin = db.users.find((u) => u.username.toLowerCase() === adminLower);

  if (admin) {
    admin.password_hash = hash;
    admin.role = "admin";
    admin.username = ADMIN_USERNAME;
  } else {
    admin = {
      id: db.nextId++,
      username: ADMIN_USERNAME,
      password_hash: hash,
      role: "admin",
      created_at: new Date().toISOString(),
    };
    db.users.unshift(admin);
  }

  db.users = db.users.filter(
    (u) => u.username.toLowerCase() !== "admin" || u.id === admin.id
  );
  return db;
}

async function readDb() {
  if (cache && !process.env.VERCEL) return cache;

  let db = await readRawDb();
  if (!db) {
    db = defaultDb();
    db = ensureAdminUser(db);
    if (!db.plans) db.plans = {};
    await saveDb(db);
  } else {
    db = ensureAdminUser(db);
    if (!db.plans) db.plans = {};
  }

  if (!process.env.VERCEL) cache = db;
  return db;
}

async function saveDb(db) {
  await writeRawDb(db);
  if (!process.env.VERCEL) cache = db;
}

async function findUserByUsername(username) {
  const db = await readDb();
  const lower = username.toLowerCase();
  return db.users.find((u) => u.username.toLowerCase() === lower) || null;
}

async function findUserById(id) {
  const db = await readDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

async function getAllUsers() {
  const db = await readDb();
  return db.users
    .map(({ id, username, role, created_at }) => ({ id, username, role, created_at }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function createUser(username, passwordHash, role) {
  const db = await readDb();
  const user = {
    id: db.nextId++,
    username,
    password_hash: passwordHash,
    role,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  await saveDb(db);
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

async function deleteUser(id) {
  const db = await readDb();
  db.users = db.users.filter((u) => u.id !== id);
  delete db.plans[String(id)];
  await saveDb(db);
}

function normalizeUserPlans(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw.goal !== undefined) {
    const crypto = require("crypto");
    return [{ ...raw, id: raw.id || crypto.randomUUID() }];
  }
  return [];
}

async function getUserPlans(userId) {
  const db = await readDb();
  const key = String(userId);
  const raw = db.plans[key];
  const plans = normalizeUserPlans(raw);
  if (raw && !Array.isArray(raw)) {
    db.plans[key] = plans;
    await saveDb(db);
  }
  return plans;
}

async function getUserPlanById(userId, planId) {
  const plans = await getUserPlans(userId);
  return plans.find((p) => p.id === planId) || null;
}

async function addUserPlan(userId, plan) {
  const db = await readDb();
  const key = String(userId);
  const plans = normalizeUserPlans(db.plans[key]);
  plans.unshift(plan);
  db.plans[key] = plans;
  await saveDb(db);
  return plan;
}

async function updateUserPlan(userId, planId, updates) {
  const db = await readDb();
  const key = String(userId);
  const plans = normalizeUserPlans(db.plans[key]);
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) return null;
  plans[idx] = { ...plans[idx], ...updates };
  db.plans[key] = plans;
  await saveDb(db);
  return plans[idx];
}

async function deleteUserPlanById(userId, planId) {
  const db = await readDb();
  const key = String(userId);
  const plans = normalizeUserPlans(db.plans[key]).filter((p) => p.id !== planId);
  db.plans[key] = plans;
  await saveDb(db);
}

async function getUserPlan(userId) {
  const plans = await getUserPlans(userId);
  return plans[0] || null;
}

async function saveUserPlan(userId, plan) {
  if (plan.id) return updateUserPlan(userId, plan.id, plan);
  return addUserPlan(userId, plan);
}

async function deleteUserPlan(userId) {
  const db = await readDb();
  delete db.plans[String(userId)];
  await saveDb(db);
}

module.exports = {
  readDb,
  saveDb,
  storageMode,
  isPersistentStorage,
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  deleteUser,
  getUserPlan,
  getUserPlans,
  getUserPlanById,
  addUserPlan,
  updateUserPlan,
  saveUserPlan,
  deleteUserPlan,
  deleteUserPlanById,
};
