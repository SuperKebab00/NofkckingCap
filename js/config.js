export const CONFIG = {
  APP_MODE: "prod",
  HOSTING_TARGET: "cloudflare-pages",

  DATA_PROVIDER: "supabase",

  SUPABASE_URL: "https://vbwltkmqfmbxrrfqqeff.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2x0a21xZm1ieHJyZnFxZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDUzNzAsImV4cCI6MjA5NTM4MTM3MH0.wnvfvoVvKJV7w9EYyurcu27OsriyBQXPXbLddR9vLJg",

  API_BASE_URL: "",
  CONTACT_ENDPOINT: "",

  ENABLED_PAYMENT_METHODS: ["in-shop"],
  ADMIN_MODE: "supabase-auth",

  LOCAL_ADMIN_PASSWORD: "",

  LEGAL_COMPANY_NAME: "No Cap Barber Shop",
  LEGAL_PRIVACY_EMAIL: "privacy@nocap.it",
  COOKIE_POLICY_VERSION: 1,
  COOKIE_CONSENT_MAX_AGE_DAYS: 180,
};

export function canUseSupabase() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}

export function isPaymentMethodEnabled(method) {
  const enabled = Array.isArray(CONFIG.ENABLED_PAYMENT_METHODS)
    ? CONFIG.ENABLED_PAYMENT_METHODS
    : ["in-shop"];
  return enabled.includes(method);
}
