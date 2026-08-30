(function initTheme() {
  const saved = localStorage.getItem("hsalati-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("hsalati-theme", next);
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.textContent = next === "dark" ? "☀️" : "🌙";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.addEventListener("click", toggleTheme);
  });
});
