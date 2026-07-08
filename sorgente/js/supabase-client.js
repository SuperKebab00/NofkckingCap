import { CONFIG, canUseSupabase } from "./config.js";

let cachedClient = null;

export async function getSupabaseClient() {
  if (!canUseSupabase()) return null;
  if (cachedClient) return cachedClient;

  try {
    // opzionale: funziona solo online. In locale/offline si usa il repository locale.
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    cachedClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return cachedClient;
  } catch {
    return null;
  }
}

