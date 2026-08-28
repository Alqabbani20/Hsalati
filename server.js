const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const {
  findUserByUsername,
  findUserById,
  getAllUsers,
  createUser,
  deleteUser,
} = require("./lib/db");
const {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  signToken,
  verifyToken,
  authMiddleware,
  adminMiddleware,
} = require("./lib/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const root = __dirname;

app.use(express.json());
app.use(cookieParser());

// ── Auth API ──

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = findUserByUsername(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({
    user: { id: user.id, username: user.username, role: user.role },
  });
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ── Admin API ──

app.get("/api/users", authMiddleware, adminMiddleware, (_req, res) => {
  res.json({ users: getAllUsers() });
});

app.post("/api/users", authMiddleware, adminMiddleware, (req, res) => {
  const { username, password, role = "user" } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Role must be user or admin" });
  }
  if (findUserByUsername(trimmed)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const hash = bcrypt.hashSync(password, 10);
  const user = createUser(trimmed, hash, role);
  res.status(201).json({ user });
});

app.delete("/api/users/:id", authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid user id" });

  const target = findUserById(id);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  deleteUser(id);
  res.json({ ok: true });
});

// ── Protected pages (server-side redirect) ──

app.get("/challenge.html", (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect("/login.html");
  next();
});

app.get("/admin.html", (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect("/login.html");
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return res.redirect("/login.html?error=admin");
  }
  next();
});

// ── Static files ──

app.use(express.static(root));

app.listen(PORT, () => {
  console.log(`حصالتي running at http://localhost:${PORT}`);
});

module.exports = app;
