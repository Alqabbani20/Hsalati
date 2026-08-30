const { getTemplates } = require("./planTemplates");
const { getBadgeDef } = require("./planTemplates");
const { planSavedTotal, computeStreak, computeInsights, checkBadgeEligibility } = require("./analytics");
const {
  logActivity, recordSaveEvent, getSaveEvents, getProfile, updateProfile,
  getUserBadges, awardBadges, submitSurvey, hasSurveyResponse, getActivityLog, disableUser, enableUser,
} = require("./features");

function registerApiRoutes(app, deps) {
  const {
    authMiddleware, adminMiddleware, generatePlan,
    findUserByUsername, findUserById, getAllUsers, createUser, deleteUser,
    getUserPlans, getUserPlanById, addUserPlan, updateUserPlan, deleteUserPlanById,
    bcrypt, signToken, COOKIE_NAME, COOKIE_OPTIONS,
  } = deps;

  function planProgress(plan) {
    const saved = planSavedTotal(plan);
    const pct = plan.goal ? Math.min(100, Math.round((saved / plan.goal) * 100)) : 0;
    return { saved, pct };
  }

  async function processBadges(userId) {
    const plans = await getUserPlans(userId);
    const events = await getSaveEvents(userId);
    const existing = (await getUserBadges(userId)).map((b) => b.badge_id);
    const newIds = checkBadgeEligibility(plans, events, existing);
    if (newIds.length) await awardBadges(userId, newIds);
    return newIds;
  }

  app.get("/api/templates", authMiddleware, (req, res) => {
    const lang = req.query.lang === "en" ? "en" : "ar";
    res.json({ templates: getTemplates(lang) });
  });

  app.get("/api/dashboard", authMiddleware, async (req, res) => {
    try {
      const plans = await getUserPlans(req.user.id);
      const events = await getSaveEvents(req.user.id);
      const insights = computeInsights(plans, events);
      const { streak, lastSaveDaysAgo } = computeStreak(
        events.filter((e) => e.event_type !== "cell_uncheck").map((e) => e.created_at)
      );
      const badges = await getUserBadges(req.user.id);
      const lang = req.query.lang === "en" ? "en" : "ar";
      res.json({
        insights,
        streak,
        lastSaveDaysAgo,
        plans: plans.map((p) => ({ ...planProgress(p), id: p.id, name: p.name, goal: p.goal })),
        badges: badges.map((b) => ({ ...getBadgeDef(b.badge_id, lang), earned_at: b.earned_at })).filter(Boolean),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message, hint: err.hint });
    }
  });

  app.get("/api/profile", authMiddleware, async (req, res) => {
    try {
      const profile = await getProfile(req.user.id);
      const surveyed = await hasSurveyResponse(req.user.id);
      res.json({ profile, surveyed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/profile", authMiddleware, async (req, res) => {
    try {
      await updateProfile(req.user.id, req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/survey", authMiddleware, async (req, res) => {
    try {
      await submitSurvey(req.user.id, req.body.answers || {});
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/password-reset-request", async (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
      const user = await findUserByUsername(username.trim());
      if (user) await logActivity(user.id, "password_reset_requested", { username: user.username });
      res.json({ ok: true, message: "If the account exists, admin will reset your password." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/activity", authMiddleware, adminMiddleware, async (_req, res) => {
    try {
      res.json({ activity: await getActivityLog(100) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users/import", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { users } = req.body;
      if (!Array.isArray(users)) return res.status(400).json({ error: "users array required" });
      const created = [];
      for (const row of users) {
        const username = String(row.username || "").trim();
        const password = String(row.password || "");
        const role = row.role === "admin" ? "admin" : "user";
        if (username.length < 3 || password.length < 6) continue;
        if (await findUserByUsername(username)) continue;
        const hash = bcrypt.hashSync(password, 10);
        const u = await createUser(username, hash, role);
        await logActivity(req.user.id, "user_imported", { username });
        created.push(u);
      }
      res.json({ created: created.length, users: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/users/:id/disable", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (id === req.user.id) return res.status(400).json({ error: "Cannot disable yourself" });
      await disableUser(id);
      await logActivity(req.user.id, "user_disabled", { targetId: id });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/users/:id/enable", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      await enableUser(parseInt(req.params.id, 10));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Enhanced plan check with events + milestones
  app.put("/api/plans/:id/check", authMiddleware, async (req, res) => {
    try {
      const plan = await getUserPlanById(req.user.id, req.params.id);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const oldChecked = { ...(plan.checked || {}) };
      const newChecked = req.body.checked || {};
      const partials = req.body.partials ?? plan.partials ?? {};
      const prevSaved = planSavedTotal(plan);

      for (let r = 0; r < plan.grid.length; r++) {
        for (let c = 0; c < plan.grid[r].length; c++) {
          const amt = plan.grid[r][c];
          const key = `${r}-${c}`;
          const was = !!oldChecked[key];
          const now = !!newChecked[key];
          if (!was && now) await recordSaveEvent(req.user.id, plan.id, amt, key, "cell_check");
          if (was && !now) await recordSaveEvent(req.user.id, plan.id, amt, key, "cell_uncheck");
        }
      }

      if (req.body.partialAmount) {
        const amt = Math.round(Number(req.body.partialAmount));
        if (amt > 0) {
          partials[`p-${Date.now()}`] = amt;
          await recordSaveEvent(req.user.id, plan.id, amt, null, "partial");
        }
      }

      const updated = await updateUserPlan(req.user.id, req.params.id, {
        checked: newChecked,
        partials,
      });

      const saved = planSavedTotal(updated);
      const pct = Math.min(100, Math.round((saved / updated.goal) * 100));
      const milestones = updated.milestones_shown || {};
      const newMilestones = [];
      [25, 50, 75, 100].forEach((m) => {
        if (pct >= m && !milestones[String(m)]) {
          milestones[String(m)] = true;
          newMilestones.push(m);
        }
      });
      if (newMilestones.length) {
        await updateUserPlan(req.user.id, req.params.id, { milestones_shown: milestones });
        updated.milestones_shown = milestones;
      }

      const newBadges = await processBadges(req.user.id);
      if (saved > prevSaved) await logActivity(req.user.id, "plan_save", { planId: plan.id, saved });

      res.json({ plan: updated, newMilestones, newBadges, saved, pct });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message, hint: err.hint });
    }
  });

  app.post("/api/plans", authMiddleware, async (req, res) => {
    try {
      const { goal, days, name, templateId, grid: customGrid } = req.body;
      const goalNum = Math.round(Number(goal));
      const daysNum = Math.round(Number(days));
      if (!goalNum || goalNum < 10 || goalNum > 50000) return res.status(400).json({ error: "Goal must be 10–50,000 KD" });
      if (!daysNum || daysNum < 1 || daysNum > 365) return res.status(400).json({ error: "Days must be 1–365" });

      const plan = generatePlan(goalNum, daysNum, name?.trim());
      if (customGrid && Array.isArray(customGrid)) plan.grid = customGrid;
      plan.partials = {};
      plan.milestones_shown = {};
      if (templateId) plan.templateId = templateId;

      await addUserPlan(req.user.id, plan);
      await logActivity(req.user.id, "plan_created", { planId: plan.id, name: plan.name });
      await processBadges(req.user.id);
      res.status(201).json({ plan });
    } catch (err) {
      res.status(500).json({ error: err.message, hint: err.hint });
    }
  });

  return { planProgress };
}

module.exports = { registerApiRoutes };
