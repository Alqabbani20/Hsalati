// Shared auth helpers for حصالتي

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "same-origin", ...options });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const outdated = typeof getLang === "function" && getLang() === "ar"
      ? "الخادم قديم — أعد تشغيل npm start"
      : "Server outdated — restart with npm start";
    throw new Error(res.status === 404 ? outdated : text || "Request failed");
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.hint = data.hint;
    throw err;
  }
  return data;
}

async function getCurrentUser() {
  try {
    const data = await apiFetch("/api/me");
    return data.user;
  } catch {
    return null;
  }
}

async function requireAuth(redirectTo = "/login.html") {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.role !== "admin") {
    window.location.href = "/challenge.html";
    return null;
  }
  return user;
}

async function logout() {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  window.location.href = "/login.html";
}
