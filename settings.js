// User theme settings — pink, blue, dark

const COLOR_THEMES = ["pink", "blue", "dark"];

function themeSwatchStyle(theme) {
  if (theme === "blue") return "background:linear-gradient(135deg,#0c4a6e,#0369a1);color:#fff";
  if (theme === "dark") return "background:linear-gradient(135deg,#1e293b,#0f172a);color:#f8fafc";
  return "background:linear-gradient(135deg,#fce7f3,#f472b6)";
}

async function loadUserColorTheme() {
  try {
    const data = await apiFetch("/api/profile");
    const theme = data.profile?.color_theme;
    if (COLOR_THEMES.includes(theme)) return theme;
  } catch { /* ignore */ }
  return null;
}

async function saveUserColorTheme(theme) {
  if (!COLOR_THEMES.includes(theme)) return;
  await apiFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ color_theme: theme }),
  });
  if (typeof applyColorTheme === "function") applyColorTheme(theme);
}

function renderThemePicker(container, currentTheme, options = {}) {
  const { localOnly = false } = options;
  const active = COLOR_THEMES.includes(currentTheme) ? currentTheme : "pink";
  const labels = {
    pink: typeof t === "function" ? t("themePink") : "Pink",
    blue: typeof t === "function" ? t("themeBlue") : "Blue",
    dark: typeof t === "function" ? t("themeDark") : "Dark",
  };

  container.innerHTML = `
    <div class="theme-picker" role="radiogroup" aria-label="${typeof t === "function" ? t("themeSettings") : "Theme"}">
      ${COLOR_THEMES.map((theme) => `
        <button type="button" class="theme-option${active === theme ? " active" : ""}" data-theme="${theme}" role="radio" aria-checked="${active === theme}">
          <span class="theme-swatch" style="${themeSwatchStyle(theme)}"></span>
          <span class="theme-label">${labels[theme]}</span>
        </button>`).join("")}
    </div>`;

  container.querySelectorAll(".theme-option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const theme = btn.dataset.theme;
      container.querySelectorAll(".theme-option").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-checked", b === btn);
      });
      try {
        if (localOnly) {
          if (typeof applyColorTheme === "function") applyColorTheme(theme);
        } else {
          await saveUserColorTheme(theme);
        }
        const msg = container.parentElement?.querySelector(".theme-saved");
        if (msg) {
          msg.classList.add("show");
          setTimeout(() => msg.classList.remove("show"), 2000);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function initThemeSettings(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let current = typeof getSavedColorTheme === "function" ? getSavedColorTheme() : "pink";
  if (!options.localOnly) {
    const fromProfile = await loadUserColorTheme();
    if (fromProfile) current = fromProfile;
  }
  renderThemePicker(container, current, options);
}
