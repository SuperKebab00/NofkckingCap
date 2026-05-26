export const CONFIG = {
  APP_MODE: "demo",
  HOSTING_TARGET: "cloudflare-pages",
  DATA_PROVIDER: "local",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  API_BASE_URL: "",
  CONTACT_ENDPOINT: "",
  CHECKOUT_MODE: "demo",
  ADMIN_MODE: "demo",
  // Solo demo locale: non e' sicurezza reale. In produzione usare Supabase Auth.
  DEMO_ADMIN_PASSWORD: "nocap2026"
};

export function canUseSupabase() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}

