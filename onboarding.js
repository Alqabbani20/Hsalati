const ONBOARDING_STEPS = {
  ar: [
    { title: "مرحباً في حصالتي! 🐷", body: "اختر مبلغاً من اللوحة كلما وفّرت — وشاهد حصالتك تنمو." },
    { title: "خطط غير محدودة", body: "أنشئ خططاً متعددة: طوارئ، سيارة، سفر — بدون حد." },
    { title: "تتبّع تقدمك", body: "لوحة التحكم تعرض سلسلة التوفير، الشارات، والاتجاه الشهري." },
  ],
  en: [
    { title: "Welcome to Hsalati! 🐷", body: "Pick an amount from the board whenever you save — watch your piggy bank grow." },
    { title: "Unlimited plans", body: "Create multiple plans: emergency, car, travel — no limits." },
    { title: "Track your progress", body: "The dashboard shows your streak, badges, and monthly trend." },
  ],
};

async function initOnboarding() {
  try {
    const { profile, surveyed } = await apiFetch("/api/profile");
    if (profile?.onboarding_completed) return;
    showOnboarding(0, surveyed);
  } catch { /* skip if API unavailable */ }
}

function showOnboarding(step, surveyed) {
  const lang = getLang();
  const steps = ONBOARDING_STEPS[lang] || ONBOARDING_STEPS.ar;
  if (step >= steps.length) {
    finishOnboarding(surveyed);
    return;
  }

  const s = steps[step];
  const overlay = document.createElement("div");
  overlay.id = "onboardingOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(30,41,59,.5);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;";
  overlay.innerHTML = `
    <div style="background:var(--white,#fff);border-radius:20px;padding:28px;max-width:360px;width:100%;border:2px solid #fce7f3;text-align:center;">
      <h2 style="font-family:Amiri,serif;color:#ec4899;margin-bottom:10px;font-size:1.3rem">${s.title}</h2>
      <p style="color:#64748b;font-size:0.9rem;line-height:1.5;margin-bottom:20px">${s.body}</p>
      <div style="display:flex;gap:8px;justify-content:center">
        ${step > 0 ? `<button id="obSkip" style="padding:10px 18px;border-radius:99px;border:1px solid #fbcfe8;background:#fdf2f8;color:#ec4899;cursor:pointer;font-family:inherit">${lang === "ar" ? "تخطي" : "Skip"}</button>` : ""}
        <button id="obNext" style="padding:10px 24px;border-radius:99px;border:none;background:#f472b6;color:#fff;font-weight:700;cursor:pointer;font-family:inherit">${step < steps.length - 1 ? (lang === "ar" ? "التالي" : "Next") : (lang === "ar" ? "ابدأ" : "Start")}</button>
      </div>
      <div style="margin-top:14px;font-size:0.75rem;color:#94a3b8">${step + 1} / ${steps.length}</div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector("#obNext").addEventListener("click", () => {
    overlay.remove();
    showOnboarding(step + 1, surveyed);
  });
  overlay.querySelector("#obSkip")?.addEventListener("click", () => {
    overlay.remove();
    finishOnboarding(surveyed);
  });
}

async function finishOnboarding(surveyed) {
  try {
    await apiFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_completed: true }),
    });
  } catch { /* ignore */ }
  if (!surveyed) showSurvey();
}

function showSurvey() {
  const lang = getLang();
  const overlay = document.createElement("div");
  overlay.id = "surveyOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(30,41,59,.5);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;";
  overlay.innerHTML = `
    <div style="background:var(--white,#fff);border-radius:20px;padding:28px;max-width:400px;width:100%;border:2px solid #fce7f3;">
      <h2 style="font-family:Amiri,serif;color:#ec4899;margin-bottom:16px;font-size:1.2rem">${lang === "ar" ? "سؤال سريع" : "Quick question"}</h2>
      <label style="display:block;font-size:0.85rem;color:#64748b;margin-bottom:8px">${lang === "ar" ? "ما هدفك الرئيسي من التوفير؟" : "What's your main savings goal?"}</label>
      <select id="surveyGoal" style="width:100%;padding:10px;border:2px solid #fce7f3;border-radius:10px;margin-bottom:14px;font-family:inherit">
        <option value="emergency">${lang === "ar" ? "صندوق طوارئ" : "Emergency fund"}</option>
        <option value="car">${lang === "ar" ? "سيارة" : "Car"}</option>
        <option value="travel">${lang === "ar" ? "سفر" : "Travel"}</option>
        <option value="other">${lang === "ar" ? "أخرى" : "Other"}</option>
      </select>
      <button id="surveySubmit" style="width:100%;padding:12px;border-radius:99px;border:none;background:#f472b6;color:#fff;font-weight:700;cursor:pointer;font-family:inherit">${lang === "ar" ? "إرسال" : "Submit"}</button>
      <button id="surveySkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:none;color:#94a3b8;cursor:pointer;font-family:inherit;font-size:0.82rem">${lang === "ar" ? "تخطي" : "Skip"}</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("#surveySkip").addEventListener("click", close);
  overlay.querySelector("#surveySubmit").addEventListener("click", async () => {
    try {
      await apiFetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { goal: overlay.querySelector("#surveyGoal").value } }),
      });
    } catch { /* ignore */ }
    close();
  });
}
