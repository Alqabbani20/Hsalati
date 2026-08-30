function generatePlan(goal, days) {
  const total = Math.round(Number(goal));
  const numDays = Math.max(1, Math.min(365, Math.round(Number(days))));
  const cols = Math.min(11, numDays);
  const amounts = [];
  let remaining = total;

  for (let i = 0; i < numDays - 1; i++) {
    const slotsLeft = numDays - i;
    const avg = remaining / slotsLeft;
    const minAmt = Math.max(1, Math.floor(avg * 0.4));
    const maxAmt = Math.max(minAmt, Math.min(Math.ceil(avg * 1.6), remaining - (slotsLeft - 1)));
    const amt = Math.round(minAmt + Math.random() * (maxAmt - minAmt));
    amounts.push(amt);
    remaining -= amt;
  }
  amounts.push(Math.max(1, remaining));

  const diff = amounts.reduce((a, b) => a + b, 0) - total;
  if (diff !== 0) amounts[amounts.length - 1] -= diff;

  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }

  const grid = [];
  for (let i = 0; i < amounts.length; i += cols) {
    grid.push(amounts.slice(i, i + cols));
  }

  const dailyTarget = Math.round((total / numDays) * 10) / 10;

  return { goal: total, days: numDays, grid, checked: {}, dailyTarget, created_at: new Date().toISOString() };
}

module.exports = { generatePlan };
