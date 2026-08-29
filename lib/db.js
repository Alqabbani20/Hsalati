const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Alqabbani";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const dataDir = process.env.VERCEL
  ? os.tmpdir()
  : path.join(__dirname, "..", "data");

const dbPath = path.join(dataDir, "users.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readDb() {
  if (!fs.existsSync(dbPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return null;
  }
}

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function ensureAdminUser(db) {
  if (!ADMIN_PASSWORD) return db;

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

function initDb() {
  let db = readDb();

  if (!db) {
    const users = [];
    if (ADMIN_PASSWORD) {
      const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      users.push({
        id: 1,
        username: ADMIN_USERNAME,
        password_hash: hash,
        role: "admin",
        created_at: new Date().toISOString(),
      });
    }
    db = { nextId: users.length + 1, users };
  }

  db = ensureAdminUser(db);
  saveDb(db);
  return db;
}

initDb();

function findUserByUsername(username) {
  const db = readDb();
  if (!db) return null;
  const lower = username.toLowerCase();
  return db.users.find((u) => u.username.toLowerCase() === lower) || null;
}

function findUserById(id) {
  const db = readDb();
  if (!db) return null;
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

function getAllUsers() {
  const db = readDb();
  if (!db) return [];
  return db.users
    .map(({ id, username, role, created_at }) => ({ id, username, role, created_at }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function createUser(username, passwordHash, role) {
  const db = readDb() || { nextId: 1, users: [] };
  const user = {
    id: db.nextId++,
    username,
    password_hash: passwordHash,
    role,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb(db);
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

function deleteUser(id) {
  const db = readDb();
  if (!db) return;
  db.users = db.users.filter((u) => u.id !== id);
  saveDb(db);
}

module.exports = {
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  deleteUser,
};
