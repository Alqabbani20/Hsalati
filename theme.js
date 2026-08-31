const COLOR_THEME_META = { pink: "#f472b6", blue: "#0369a1", dark: "#0f172a" };
const VALID_COLOR_THEMES = ["pink", "blue", "dark"];

function getSavedColorTheme() {
  const saved = localStorage.getItem("hsalati-color-theme");
  return VALID_COLOR_THEMES.includes(saved) ? saved : "pink";
}

function applyColorTheme(theme, options = {}) {
  const { persist = true } = options;
  const resolved = VALID_COLOR_THEMES.includes(theme) ? theme : "pink";

  if (resolved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.removeAttribute("data-color-theme");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.setAttribute("data-color-theme", resolved);
  }

  if (persist) localStorage.setItem("hsalati-color-theme", resolved);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = COLOR_THEME_META[resolved];

  document.querySelectorAll(".theme-option").forEach((btn) => {
    const isActive = btn.dataset.theme === resolved;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive);
  });
}

function clearColorTheme() {
  localStorage.removeItem("hsalati-color-theme");
  document.documentElement.setAttribute("data-theme", "light");
  document.documentElement.setAttribute("data-color-theme", "pink");
}

function themeFromGender(gender) {
  if (gender === "male") return "blue";
  if (gender === "female") return "pink";
  return "pink";
}

async function initUserTheme() {
  try {
    const res = await fetch("/api/profile", { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      if (VALID_COLOR_THEMES.includes(data.profile?.color_theme)) {
        applyColorTheme(data.profile.color_theme);
        return;
      }
    }
  } catch { /* not logged in */ }

  try {
    const me = await fetch("/api/me", { credentials: "same-origin" });
    if (me.ok) {
      const data = await me.json();
      applyColorTheme(themeFromGender(data.user?.gender));
      return;
    }
  } catch { /* ignore */ }

  applyColorTheme(getSavedColorTheme(), { persist: false });
}

(function initThemeEarly() {
  const saved = localStorage.getItem("hsalati-color-theme");
  if (VALID_COLOR_THEMES.includes(saved)) {
    applyColorTheme(saved, { persist: false });
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.textContent = "🎨";
    btn.title = "Theme";
    btn.addEventListener("click", () => {
      const order = ["pink", "blue", "dark"];
      const cur = getSavedColorTheme();
      applyColorTheme(order[(order.indexOf(cur) + 1) % order.length]);
    });
  });
  initUserTheme();
});
