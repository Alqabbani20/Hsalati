// Shared auth helpers for حصالتي

async function getCurrentUser() {
  const res = await fetch("/api/me");
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
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
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login.html";
}
