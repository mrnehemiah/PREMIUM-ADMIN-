/* ZUNE ADMIN CONFIG
   Weka URL na publishable/anon key ya Supabase hapa.
   Usitumie service_role key ndani ya browser.
*/
window.ZUNE_CONFIG = window.ZUNE_CONFIG || {
  SUPABASE_URL: "WEKA_SUPABASE_URL_HAPA",
  SUPABASE_ANON_KEY: "WEKA_SUPABASE_PUBLISHABLE_KEY_HAPA",
  AUTH_REQUIRED: true,
  ADMIN_ROLE: "admin",
  COMMISSION_RATE: 0.03
};
if (window.supabase && window.ZUNE_CONFIG.SUPABASE_URL !== "WEKA_SUPABASE_URL_HAPA" &&
    window.ZUNE_CONFIG.SUPABASE_ANON_KEY !== "WEKA_SUPABASE_PUBLISHABLE_KEY_HAPA") {
  window.zuneSupabase = window.supabase.createClient(
    window.ZUNE_CONFIG.SUPABASE_URL,
    window.ZUNE_CONFIG.SUPABASE_ANON_KEY
  );
} else {
  console.warn("ZUNE: Jaza Supabase URL na publishable key ndani ya js/config.js.");
}
