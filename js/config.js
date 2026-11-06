/* ZUNE ADMIN CONFIG
   Weka URL na publishable/anon key ya Supabase hapa.
   Usitumie service_role key ndani ya browser.
*/
window.ZUNE_CONFIG = window.ZUNE_CONFIG || {
  SUPABASE_URL: "https://rpkogiieegqgxqbzwxwo.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf",
  AUTH_REQUIRED: true,
  ADMIN_ROLE: "admin",
  COMMISSION_RATE: 0.03
};
if (window.supabase && window.ZUNE_CONFIG.SUPABASE_URL !== "https://rpkogiieegqgxqbzwxwo.supabase.co" &&
    window.ZUNE_CONFIG.SUPABASE_ANON_KEY !== "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf") {
  window.zuneSupabase = window.supabase.createClient(
    window.ZUNE_CONFIG.SUPABASE_URL,
    window.ZUNE_CONFIG.SUPABASE_ANON_KEY
  );
} else {
  console.warn("ZUNE: Jaza Supabase URL na publishable key ndani ya js/config.js.");
}
