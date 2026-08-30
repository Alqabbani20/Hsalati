// Arabic / English translations for حصالتي
const I18N = {
  ar: {
    appName: "حصالتي",
    home: "الرئيسية",
    login: "دخول",
    logout: "خروج",
    admin: "الإدارة",
    darkMode: "الوضع الليلي",
    langSwitch: "EN",

    // Login
    loginTitle: "تسجيل الدخول إلى حسابك",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    loginBtn: "دخول",
    backHome: "← العودة للصفحة الرئيسية",
    adminRequired: "يتطلب صلاحيات المدير",
    loginFailed: "فشل تسجيل الدخول",
    connectError: "تعذر الاتصال بالخادم. شغّل: npm start",

    // Challenge / plans
    myPlans: "خططي",
    newPlan: "+ خطة جديدة",
    createNewPlan: "أنشئ خطة جديدة",
    noLimit: "لا يوجد حد — أنشئ أي عدد من خطط التوفير",
    planNameOptional: "اسم الخطة (اختياري)",
    planNamePlaceholder: "مثال: سيارة جديدة",
    amountKD: "المبلغ (KD)",
    days: "عدد الأيام",
    createPlan: "إنشاء الخطة ✨",
    loading: "جاري التحميل...",
    noPlansYet: "لا توجد خطط بعد — أنشئ خطتك الأولى!",
    allPlans: "← كل الخطط",
    goalLabel: "الهدف — دينار كويتي",
    saved: "موفر",
    resetProgress: "إعادة تعيين التقدم",
    deletePlan: "حذف الخطة",
    congrats: "مبروك!",
    continue: "متابعة",
    goalReached: "🎉 تم تحقيق الهدف!",
    remaining: "متبقي",
    resetConfirm: "إعادة تعيين التقدم لهذه الخطة؟",
    deleteConfirm: "حذف هذه الخطة نهائياً؟",
    daysLabel: "يوم",
    perDay: "KD/يوم",
    slots: "خانة",
    createFailed: "فشل إنشاء الخطة",
    serverOutdated: "الخادم قديم — أعد تشغيل npm start",

    // Admin
    adminPanel: "لوحة الإدارة",
    welcome: "مرحباً،",
    createUser: "➕ إنشاء مستخدم جديد",
    role: "الصلاحية",
    createUserBtn: "إنشاء المستخدم",
    users: "👥 المستخدمون",
    noUsers: "لا يوجد مستخدمون بعد.",
    colUsername: "اسم المستخدم",
    colRole: "الصلاحية",
    colCreated: "تاريخ الإنشاء",
    delete: "حذف",
    you: "أنت",
    userCreated: "تم إنشاء المستخدم بنجاح!",
    deleteUserConfirm: "حذف المستخدم",

    // Landing
    navFeatures: "المميزات",
    navHow: "كيف يعمل",
    navChallenge: "خطط التوفير",
    navAbout: "من نحن",
    signUp: "إنشاء حساب",
    badge: "وفّر اليوم، أمّن غداً",
    heroTitle: "أموالك،\nمستقبلك.",
    heroSub: "حصالتك الرقمية التي تساعدك على التوفير وتتبع أهدافك بسهولة — بالدينار الكويتي.",
    startSaving: "ابدأ التوفير الآن ←",
    howItWorksBtn: "▷ كيف يعمل",
    socialProof: "انضم إلى أكثر من 50,000 موفّر سعيد 🎉",
    whyTitle: "لماذا حصالتي؟",
    whySub: "كل ما تحتاجه لبناء عادات توفير أفضل",
    featSecure: "آمن ومحمي",
    featSecureDesc: "بياناتك تبقى تحت سيطرتك. خاصة وآمنة دائماً.",
    featGoals: "حقّق أهدافك",
    featGoalsDesc: "أنشئ خطط توفير غير محدودة وتتبع كل خطوة.",
    featInsights: "رؤى ذكية",
    featInsightsDesc: "شاهد تقدمك بلمحة مع رسوم بيانية ونسب مئوية.",
    featAlerts: "تنبيهات فورية",
    featAlertsDesc: "احتفل بالإنجازات عند تحقيق أهدافك وابقَ متحمساً.",
    statUsers: "مستخدم سعيد",
    statSaved: "تم توفيره",
    statGoals: "هدف تحقق",
    statRating: "تقييم المستخدمين",
    howTitle: "كيف يعمل",
    howSub: "ابدأ رحلة التوفير في ثلاث خطوات بسيطة",
    step1Title: "اختر مبلغاً",
    step1Desc: "كل رقم على اللوحة يمثل مبلغ KD. اختر واحداً عندما توفر.",
    step2Title: "اضغط للتعليم",
    step2Desc: "اضغط على الرقم ويظهر علامة ✓ — حصالتك تنمو فوراً.",
    step3Title: "حقّق هدفك",
    step3Desc: "استمر حتى تحقق هدفك. سنحتفل معك!",
    ctaTitle: "مستعد للتوفير؟",
    ctaSub: "افتح لوحة خطط التوفير وابدأ رحلتك اليوم.",
    ctaBtn: "افتح خطط التوفير ←",
    footerCopy: "© 2026 حصالتي",
    footerMade: "صُنع بـ 💗 في الكويت",
    loginModalSub: "تسجيل الدخول إلى حسابك",
    phoneHello: "مرحباً، Fares 👋",
    phoneHelloGuest: "مرحباً 👋",
    phoneSavings: "مدخراتك",
    phoneTotal: "إجمالي المدخرات",
    phoneGoals: "أهدافك",
    phoneNoPlans: "لا توجد خطط بعد",
    phoneSignIn: "سجّل دخولك لعرض مدخراتك",
  },
  en: {
    appName: "Hsalati",
    home: "Home",
    login: "Login",
    logout: "Logout",
    admin: "Admin",
    darkMode: "Dark mode",
    langSwitch: "عربي",

    loginTitle: "Sign in to your account",
    username: "Username",
    password: "Password",
    loginBtn: "Sign in",
    backHome: "← Back to home",
    adminRequired: "Admin access required",
    loginFailed: "Login failed",
    connectError: "Could not connect to server. Run: npm start",

    myPlans: "My Plans",
    newPlan: "+ New Plan",
    createNewPlan: "Create a new plan",
    noLimit: "No limit — create as many savings plans as you want",
    planNameOptional: "Plan name (optional)",
    planNamePlaceholder: "e.g. New car",
    amountKD: "Amount (KD)",
    days: "Number of days",
    createPlan: "Create Plan ✨",
    loading: "Loading...",
    noPlansYet: "No plans yet — create your first one!",
    allPlans: "← All plans",
    goalLabel: "Goal — Kuwaiti Dinar",
    saved: "Saved",
    resetProgress: "Reset progress",
    deletePlan: "Delete plan",
    congrats: "Congratulations!",
    continue: "Continue",
    goalReached: "🎉 Goal reached!",
    remaining: "remaining",
    resetConfirm: "Reset progress on this plan?",
    deleteConfirm: "Delete this plan permanently?",
    daysLabel: "days",
    perDay: "KD/day",
    slots: "slots",
    createFailed: "Failed to create plan",
    serverOutdated: "Server outdated — restart with npm start",

    adminPanel: "Admin Panel",
    welcome: "Welcome,",
    createUser: "➕ Create new user",
    role: "Role",
    createUserBtn: "Create user",
    users: "👥 Users",
    noUsers: "No users yet.",
    colUsername: "Username",
    colRole: "Role",
    colCreated: "Created",
    delete: "Delete",
    you: "You",
    userCreated: "User created successfully!",
    deleteUserConfirm: "Delete user",

    navFeatures: "Features",
    navHow: "How It Works",
    navChallenge: "Savings Plans",
    navAbout: "About Us",
    signUp: "Sign Up",
    badge: "Save Today, Secure Tomorrow",
    heroTitle: "Your Money,\nYour Future.",
    heroSub: "The digital piggy bank that helps you save, track, and achieve your goals effortlessly — in Kuwaiti Dinar.",
    startSaving: "Start Saving Now →",
    howItWorksBtn: "▷ How It Works",
    socialProof: "Join 50,000+ happy savers 🎉",
    whyTitle: "Why Choose Hsalati?",
    whySub: "Everything you need to build better saving habits",
    featSecure: "Secure & Safe",
    featSecureDesc: "Your savings data stays under your control. Private and always secure.",
    featGoals: "Achieve Goals",
    featGoalsDesc: "Create unlimited savings plans and track every step.",
    featInsights: "Smart Insights",
    featInsightsDesc: "See your progress at a glance with live charts and percentages.",
    featAlerts: "Instant Alerts",
    featAlertsDesc: "Celebrate milestones when you hit your targets and stay motivated.",
    statUsers: "Happy Users",
    statSaved: "Money Saved",
    statGoals: "Goals Achieved",
    statRating: "User Rating",
    howTitle: "How It Works",
    howSub: "Start your savings journey in three simple steps",
    step1Title: "Pick an Amount",
    step1Desc: "Each number on the board represents a KD amount. Choose one whenever you save.",
    step2Title: "Tap to Mark It",
    step2Desc: "Click the number and a green checkmark appears — your piggy bank grows instantly.",
    step3Title: "Reach Your Goal",
    step3Desc: "Keep going until you hit your target. We'll celebrate with you!",
    ctaTitle: "Ready to start saving?",
    ctaSub: "Open your savings plans board and begin your journey today.",
    ctaBtn: "Open Savings Plans →",
    footerCopy: "© 2026 Hsalati",
    footerMade: "Made with 💗 in Kuwait",
    loginModalSub: "Sign in to your account",
    phoneHello: "Hello, Fares 👋",
    phoneHelloGuest: "Hello 👋",
    phoneSavings: "Your Savings",
    phoneTotal: "Total Savings",
    phoneGoals: "Your Goals",
    phoneNoPlans: "No plans yet",
    phoneSignIn: "Sign in to see your savings",
  },
};

let currentLang = localStorage.getItem("hsalati_lang") || "ar";

function getLang() {
  return currentLang;
}

function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.en[key] ?? key;
}

function setLang(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  localStorage.setItem("hsalati_lang", lang);
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

function applyI18n() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = t(key);
    if (text.includes("\n")) {
      el.innerHTML = text.split("\n").join("<br>");
    } else {
      el.textContent = text;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });

  document.querySelectorAll(".lang-toggle").forEach((btn) => {
    btn.textContent = t("langSwitch");
    btn.setAttribute("aria-label", currentLang === "ar" ? "Switch to English" : "التبديل إلى العربية");
  });
}

function initI18n() {
  applyI18n();
  document.querySelectorAll(".lang-toggle").forEach((btn) => {
    btn.addEventListener("click", () => setLang(currentLang === "ar" ? "en" : "ar"));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initI18n);
} else {
  initI18n();
}
