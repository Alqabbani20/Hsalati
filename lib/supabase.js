const { createClient } = require("@supabase/supabase-js");

let client = null;

function useSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseOptions() {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  // Node 20 on Vercel has no native WebSocket — required for supabase-js realtime init
  if (typeof WebSocket === "undefined") {
    try {
      const ws = require("ws");
      options.realtime = { transport: ws };
    } catch {
      // ws not installed — getSupabase() will still work for REST if client lazy-inits without realtime
    }
  }

  return options;
}

function getSupabase() {
  if (!useSupabase()) {
    throw new Error("Supabase is not configured");
  }
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      getSupabaseOptions()
    );
  }
  return client;
}

module.exports = { useSupabase, getSupabase };
