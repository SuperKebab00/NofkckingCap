export const CONFIG = {
  APP_MODE: "prod",
  HOSTING_TARGET: "cloudflare-pages",

  DATA_PROVIDER: "supabase",

  SUPABASE_URL: "https://vbwltkmqfmbxrrfqqeff.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2x0a21xZm1ieHJyZnFxZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDUzNzAsImV4cCI6MjA5NTM4MTM3MH0.wnvfvoVvKJV7w9EYyurcu27OsriyBQXPXbLddR9vLJg",

  API_BASE_URL: "", 
  CONTACT_ENDPOINT: "", 


  CHECKOUT_MODE: "paypal", 
  ADMIN_MODE: "supabase-auth",


  DEMO_ADMIN_PASSWORD: ""
};

export function canUseSupabase() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}
