const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "users.json");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Alqabbani";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function getAdminPassword() {
  if (!ADMIN_PASSWORD) return null;
  return ADMIN_PASSWORD;
}

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function ensureAdminUser(db) {
  const password = getAdminPassword();
  if (!password) return;

  const hash = bcrypt.hashSync(password, 10);
  let admin = db.users.find((u) => u.username === ADMIN_USERNAME);

  if (admin) {
    admin.password_hash = hash;
    admin.role = "admin";
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

  db.users = db.users.filter((u) => u.username !== "admin");
  saveDb(db);
}

function loadDb() {
  if (!fs.existsSync(dbPath)) {
    const password = getAdminPassword();
    const users = [];
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      users.push({
        id: 1,
        username: ADMIN_USERNAME,
        password_hash: hash,
        role: "admin",
        created_at: new Date().toISOString(),
      });
    }
    const initial = { nextId: users.length + 1, users };
    saveDb(initial);
    return initial;
  }

  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  ensureAdminUser(db);
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

// Initialize on startup
loadDb();

function findUserByUsername(username) {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  return db.users.find((u) => u.username === username) || null;
}

function findUserById(id) {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

function getAllUsers() {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  return db.users
    .map(({ id, username, role, created_at }) => ({ id, username, role, created_at }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function createUser(username, passwordHash, role) {
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
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
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
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
