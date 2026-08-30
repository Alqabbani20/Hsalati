const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Alqabbani";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const BLOB_NAME = "hsalati-db.json";

const dataDir = process.env.VERCEL
  ? os.tmpdir()
  : path.join(__dirname, "..", "data");

const dbPath = path.join(dataDir, "users.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let cache = null;
let blobModule = null;

function useBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function getBlob() {
  if (!blobModule) {
    blobModule = require("@vercel/blob");
  }
  return blobModule;
}

async function readFromBlob() {
  try {
    const { list } = await getBlob();
    const { blobs } = await list({ prefix: BLOB_NAME, limit: 1 });
    if (!blobs.length) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}

async function writeToBlob(db) {
  const { put } = await getBlob();
  await put(BLOB_NAME, JSON.stringify(db, null, 2), {
    access: "private",
    addRandomSuffix: false,
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
  if (cache) return cache;

  let db = useBlob() ? await readFromBlob() : readFromFile();
  if (!db) db = defaultDb();

  db = ensureAdminUser(db);
  if (!db.plans) db.plans = {};

  cache = db;
  await saveDb(db);
  return cache;
}

async function saveDb(db) {
  cache = db;
  if (useBlob()) {
    await writeToBlob(db);
  } else {
    writeToFile(db);
  }
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

async function getUserPlan(userId) {
  const db = await readDb();
  return db.plans[String(userId)] || null;
}

async function saveUserPlan(userId, plan) {
  const db = await readDb();
  db.plans[String(userId)] = plan;
  await saveDb(db);
  return plan;
}

async function deleteUserPlan(userId) {
  const db = await readDb();
  delete db.plans[String(userId)];
  await saveDb(db);
}

module.exports = {
  readDb,
  saveDb,
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  deleteUser,
  getUserPlan,
  saveUserPlan,
  deleteUserPlan,
};
