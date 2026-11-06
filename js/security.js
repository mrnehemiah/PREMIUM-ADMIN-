(() => {
  'use strict';
  const db = () => window.zuneSupabase;
  const cfg = window.ZUNE_CONFIG || {};
  async function requireAdmin() {
    if (!db()) throw new Error('Supabase haijaunganishwa.');
    const { data: { session }, error } = await db().auth.getSession();
    if (error) throw error;
    if (!session?.user) {
      const back = encodeURIComponent(location.pathname + location.hash);
      location.replace(`login.html?redirect=${back}`);
      return null;
    }
    const { data: profile, error: profileError } = await db().from('profiles')
      .select('id,full_name,email,role,account_status').eq('id', session.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || String(profile.role || '').toLowerCase() !== String(cfg.ADMIN_ROLE || 'admin')) {
      await db().auth.signOut();
      throw new Error('Akaunti hii haina mamlaka ya Admin Mkuu.');
    }
    if (/suspended|blocked|disabled/i.test(String(profile.account_status || ''))) {
      await db().auth.signOut();
      throw new Error('Akaunti ya msimamizi imesimamishwa.');
    }
    window.ZUNE_CURRENT_USER = session.user;
    window.ZUNE_ADMIN_PROFILE = profile;
    window.ZUNE_AUTH_READY = Promise.resolve(profile);
    return profile;
  }
  async function signOut() {
    if (db()) await db().auth.signOut();
    location.replace('login.html');
  }
  window.ZUNE_SECURITY = { requireAdmin, signOut };
})();
