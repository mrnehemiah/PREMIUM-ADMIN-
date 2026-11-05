
/* =========================================
   ZUNE SUPABASE CONFIGURATION
========================================= */

(function () {

  window.SUPABASE_URL =
    "https://rpkogiieegqgxqbzwxwo.supabase.co";

  window.SUPABASE_ANON_KEY =
    "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";

  /* CHECK SUPABASE LIBRARY */

  if (
    !window.supabase ||
    !window.supabase.createClient
  ) {
    console.error(
      "Supabase library haijapakiwa."
    );

    return;
  }

  /* CREATE CLIENT */

  window.zuneSupabase =
    window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

  /* CONNECT TO ZUNE */

  window.ZUNE = window.ZUNE || {};

  window.ZUNE.sb = window.zuneSupabase;

  window.ZUNE.ready = Promise.resolve(
    window.zuneSupabase
  );

  console.log(
    "ZUNE SUPABASE CONNECTED SUCCESSFULLY"
  );

})();
