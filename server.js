require("dotenv").config();
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
  getUserPlans,
  getUserPlanById,
  addUserPlan,
  updateUserPlan,
  deleteUserPlanById,
  updateUserPassword,
  storageMode,
  isPersistentStorage,
} = require("./lib/db");
const { useSupabase } = require("./lib/supabase");
const { generatePlan } = require("./lib/generatePlan");
const { planSavedTotal } = require("./lib/analytics");
const { registerApiRoutes } = require("./lib/apiRoutes");
const { loginLimiter, apiLimiter, adminLimiter } = require("./lib/rateLimit");
const {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  COOKIE_CLEAR_OPTIONS,
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
app.use("/api", apiLimiter);

app.get("/api/health", async (_req, res) => {
  const storage = storageMode();
  const result = {
    ok: true,
    admin: !!process.env.ADMIN_PASSWORD,
    storage,
    persistent: isPersistentStorage(),
    warning: storage === "ephemeral"
      ? "Add Supabase env vars for persistent storage"
      : undefined,
  };

  if (storage === "supabase") {
    try {
      const { testConnection } = require("./lib/db-supabase");
      const db = await testConnection();
      result.db = db;
    } catch (err) {
      result.ok = false;
      result.dbError = err.message;
      result.hint = err.hint || "Run supabase/schema.sql in Supabase SQL Editor";
    }
  }

  res.status(result.ok ? 200 : 503).json(result);
});

app.post("/api/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await findUserByUsername(username.trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (user.disabled_at) {
      return res.status(403).json({ error: "Account disabled. Contact admin." });
    }

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      error: "Login failed",
      hint: err.hint || (useSupabase() ? "Check Supabase tables — run supabase/schema.sql" : undefined),
    });
  }
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_CLEAR_OPTIONS);
  res.json({ ok: true });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/users", authMiddleware, adminMiddleware, adminLimiter, async (_req, res) => {
  try {
    res.json({ users: await getAllUsers() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

app.post("/api/users", authMiddleware, adminMiddleware, adminLimiter, async (req, res) => {
  try {
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
    if (await findUserByUsername(trimmed)) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hash = bcrypt.hashSync(password, 10);
    const user = await createUser(trimmed, hash, role);
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.delete("/api/users/:id", authMiddleware, adminMiddleware, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user id" });

    const target = await findUserById(id);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    await deleteUser(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

function planProgress(plan) {
  const saved = planSavedTotal(plan);
  const pct = plan.goal ? Math.min(100, Math.round((saved / plan.goal) * 100)) : 0;
  return { saved, pct };
}

app.get("/api/plans", authMiddleware, async (req, res) => {
  try {
    const plans = await getUserPlans(req.user.id);
    const summary = plans.map((p) => ({
      ...planProgress(p), id: p.id, name: p.name, goal: p.goal, days: p.days, created_at: p.created_at,
    }));
    res.json({ plans: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load plans" });
  }
});

app.get("/api/plans/:id", authMiddleware, async (req, res) => {
  try {
    const plan = await getUserPlanById(req.user.id, req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json({ plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load plan" });
  }
});

app.delete("/api/plans/:id", authMiddleware, async (req, res) => {
  try {
    const plan = await getUserPlanById(req.user.id, req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    await deleteUserPlanById(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

registerApiRoutes(app, {
  authMiddleware,
  adminMiddleware,
  generatePlan,
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
  updateUserPassword,
  bcrypt,
  signToken,
  COOKIE_NAME,
  COOKIE_OPTIONS,
});

app.get("/api/plan", authMiddleware, async (req, res) => {
  try {
    const plans = await getUserPlans(req.user.id);
    res.json({ plan: plans[0] || null, plans: plans.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to load plan" });
  }
});

function requireAuthPage(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect("/login.html");
  next();
}

app.get("/challenge.html", requireAuthPage);
app.get("/dashboard.html", requireAuthPage);

app.get("/admin.html", (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.redirect("/login.html");
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return res.redirect("/login.html?error=admin");
  }
  next();
});

const BLOCKED_PATHS = /^\/(data|lib|node_modules)(\/|$)|^\/api\/index\.js$|\/(server\.js|package\.json|package-lock\.json|vercel\.json|\.env)/i;

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use((req, res, next) => {
  if (BLOCKED_PATHS.test(req.path)) return res.sendStatus(404);
  next();
});

app.use(express.static(root, { dotfiles: "deny" }));

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`حصالتي running at http://localhost:${PORT}`);
  });
}

module.exports = app;
