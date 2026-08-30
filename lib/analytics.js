function planSavedTotal(plan) {
  let saved = 0;
  const checked = plan.checked || {};
  const partials = plan.partials || {};
  plan.grid.forEach((row, r) => row.forEach((amt, c) => {
    const key = `${r}-${c}`;
    if (checked[key]) saved += amt;
  }));
  Object.values(partials).forEach((v) => { saved += Number(v) || 0; });
  return saved;
}

function computeStreak(eventDates) {
  if (!eventDates.length) return { streak: 0, lastSaveDaysAgo: null };

  const days = [...new Set(eventDates.map((d) => d.slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let lastSaveDaysAgo = null;
  const mostRecent = days[0];
  if (mostRecent === today) lastSaveDaysAgo = 0;
  else if (mostRecent === yesterday) lastSaveDaysAgo = 1;
  else lastSaveDaysAgo = Math.floor((Date.now() - new Date(mostRecent).getTime()) / 86400000);

  let streak = 0;
  let cursor = days[0] === today ? today : (days[0] === yesterday ? yesterday : null);
  if (!cursor) return { streak: 0, lastSaveDaysAgo };

  for (const day of days) {
    if (day === cursor) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else if (day < cursor) break;
  }

  return { streak, lastSaveDaysAgo };
}

function computeInsights(plans, events) {
  const totalSaved = plans.reduce((s, p) => s + planSavedTotal(p), 0);
  const totalGoal = plans.reduce((s, p) => s + p.goal, 0);

  const byMonth = {};
  events.forEach((e) => {
    if (e.event_type === "cell_uncheck") return;
    const m = e.created_at.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + Number(e.amount);
  });

  const months = Object.entries(byMonth).sort((a, b) => b[1] - a[1]);
  const bestMonth = months[0] ? { month: months[0][0], amount: Math.round(months[0][1]) } : null;

  const last30 = events.filter((e) => {
    if (e.event_type === "cell_uncheck") return false;
    return Date.now() - new Date(e.created_at).getTime() < 30 * 86400000;
  });
  const saved30 = last30.reduce((s, e) => s + Number(e.amount), 0);
  const dailyAvg = saved30 / 30;

  let projectionDays = null;
  let speedupDays = null;
  const activePlan = plans.find((p) => planSavedTotal(p) < p.goal);
  if (activePlan && dailyAvg > 0) {
    const remaining = activePlan.goal - planSavedTotal(activePlan);
    projectionDays = Math.ceil(remaining / dailyAvg);
    speedupDays = Math.max(0, projectionDays - Math.ceil(remaining / (dailyAvg + 1)));
  }

  const monthlyTrend = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount: Math.round(amount) }));

  return { totalSaved, totalGoal, planCount: plans.length, bestMonth, dailyAvg: Math.round(dailyAvg * 10) / 10, projectionDays, speedupDays, monthlyTrend };
}

function checkBadgeEligibility(plans, events, existingBadges) {
  const earned = new Set(existingBadges);
  const newBadges = [];
  const totalSaved = plans.reduce((s, p) => s + planSavedTotal(p), 0);
  const saveEvents = events.filter((e) => e.event_type !== "cell_uncheck");

  const tryAward = (id) => { if (!earned.has(id) && !newBadges.includes(id)) newBadges.push(id); };

  if (saveEvents.length >= 1) tryAward("first_save");
  if (plans.length >= 1) tryAward("first_plan");
  if (totalSaved >= 100) tryAward("saved_100");
  if (plans.some((p) => planSavedTotal(p) >= p.goal)) tryAward("plan_complete");

  const { streak } = computeStreak(saveEvents.map((e) => e.created_at));
  if (streak >= 7) tryAward("streak_7");
  if (streak >= 30) tryAward("streak_30");

  return newBadges;
}

module.exports = { planSavedTotal, computeStreak, computeInsights, checkBadgeEligibility };
