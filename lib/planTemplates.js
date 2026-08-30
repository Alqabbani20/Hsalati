const PLAN_TEMPLATES = [
  { id: "emergency", nameAr: "صندوق طوارئ", nameEn: "Emergency Fund", goal: 500, days: 60, icon: "🛡️" },
  { id: "ramadan", nameAr: "توفير رمضان", nameEn: "Ramadan Savings", goal: 300, days: 30, icon: "🌙" },
  { id: "car", nameAr: "دفعة سيارة", nameEn: "Car Down Payment", goal: 2000, days: 365, icon: "🚗" },
  { id: "travel", nameAr: "رحلة", nameEn: "Travel", goal: 800, days: 90, icon: "✈️" },
  { id: "classic", nameAr: "حصالتي", nameEn: "Hsalati Classic", goal: 1500, days: 365, icon: "🐷" },
  { id: "wedding", nameAr: "زفاف", nameEn: "Wedding", goal: 3000, days: 365, icon: "💍" },
];

const BADGE_DEFS = {
  first_save: { icon: "⭐", nameAr: "أول توفير", nameEn: "First Save" },
  streak_7: { icon: "🔥", nameAr: "سلسلة 7 أيام", nameEn: "7-Day Streak" },
  streak_30: { icon: "💪", nameAr: "سلسلة 30 يوم", nameEn: "30-Day Streak" },
  saved_100: { icon: "💰", nameAr: "100 د.ك", nameEn: "100 KD Saved" },
  plan_complete: { icon: "🏆", nameAr: "هدف محقق", nameEn: "Goal Complete" },
  first_plan: { icon: "🎯", nameAr: "أول خطة", nameEn: "First Plan" },
};

function getTemplates(lang) {
  return PLAN_TEMPLATES.map((t) => ({
    id: t.id,
    icon: t.icon,
    name: lang === "ar" ? t.nameAr : t.nameEn,
    goal: t.goal,
    days: t.days,
  }));
}

function getBadgeDef(id, lang) {
  const b = BADGE_DEFS[id];
  if (!b) return null;
  return { id, icon: b.icon, name: lang === "ar" ? b.nameAr : b.nameEn };
}

module.exports = { PLAN_TEMPLATES, BADGE_DEFS, getTemplates, getBadgeDef };
