export const CONFIG = {
  APP_MODE: "prod",
  HOSTING_TARGET: "cloudflare-pages",

 
  DATA_PROVIDER: "supabase",

  
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",

 
  API_BASE_URL: "", 
  CONTACT_ENDPOINT: "", 


  CHECKOUT_MODE: "paypal", 
  ADMIN_MODE: "supabase-auth",


  DEMO_ADMIN_PASSWORD: ""
};

export function canUseSupabase() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}
