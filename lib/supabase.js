const { createClient } = require("@supabase/supabase-js");

let client = null;
let normalizedUrl = null;

function useSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Project URL only — strip quotes, trailing slash, and accidental /rest/v1 */
function normalizeSupabaseUrl(raw) {
  let url = String(raw || "").trim().replace(/^["']|["']$/g, "");
  url = url.replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
}

function getSupabaseOptions() {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  if (typeof WebSocket === "undefined") {
    try {
      const ws = require("ws");
      options.realtime = { transport: ws };
    } catch {
      // optional
    }
  }

  return options;
}

function getSupabase() {
  if (!useSupabase()) {
    throw new Error("Supabase is not configured");
  }
  if (!client) {
    normalizedUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalizedUrl) && !normalizedUrl.startsWith("http")) {
      console.warn("[supabase] Unusual SUPABASE_URL:", normalizedUrl);
    }
    const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
    client = createClient(normalizedUrl, key, getSupabaseOptions());
  }
  return client;
}

function getSupabaseUrl() {
  return normalizedUrl || (useSupabase() ? normalizeSupabaseUrl(process.env.SUPABASE_URL) : null);
}

module.exports = { useSupabase, getSupabase, normalizeSupabaseUrl, getSupabaseUrl };
