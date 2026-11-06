/* ZUNE PREMIUM ADMIN — public browser configuration.
 * Publishable key is intended for browser use. Never put service_role here.
 */
(() => {
  'use strict';
  const CONFIG = {
    SUPABASE_URL: 'https://rpkogiieegqgxqbzwxwo.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf',
    ADMIN_ROLE: 'admin',
    COMMISSION_RATE: 0.03,
    AUTH_REQUIRED: true,
    TABLES: {
      profiles: 'profiles',
      sellerApplications: 'seller_applications',
      products: 'products',
      orders: 'orders',
      walletTransactions: 'admin_wallet_transactions',
      disputes: 'transaction_disputes',
      notifications: 'admin_notifications',
      activityLogs: 'admin_activity_logs'
    }
  };
  window.ZUNE_CONFIG = Object.freeze(CONFIG);
  if (!window.supabase?.createClient) {
    console.error('ZUNE: Supabase JS haijapakiwa.');
    return;
  }
  window.zuneSupabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
