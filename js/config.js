  "https://rpkogiieegqgxqbzwxwo.supabase.co";

window.SUPABASE_ANON_KEY =
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

/* CREATE SUPABASE CLIENT */

if (!window.supabase || !window.supabase.createClient) {
  console.error("Supabase library haijapakiwa.");
} else {

  window.zuneSupabase = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  console.log("ZUNE Supabase connected successfully.");
}