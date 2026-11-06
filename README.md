# ZUNE PREMIUM ADMIN — package

## Files
- `index.html` — module hub / mobile-first admin landing page.
- `css/admin.css` — agreed dark emerald + gold visual system.
- `js/layout.js` — module selector and admin authentication guard.
- `js/admin.js` — overview counts, Users and Sellers read-only views; other modules show a safe setup state.
- `js/config.js` — Supabase configuration template.

## Install
1. Upload the folder contents to your hosting root, preserving `css/` and `js/`.
2. Open `js/config.js` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your project's URL and publishable/anon key.
3. Keep `AUTH_REQUIRED: true` for production. The signed-in user's `profiles.role` must equal `admin`.
4. Ensure Supabase RLS allows the Admin Mkuu account to read the required rows in `profiles`, `products`, and `orders`.
5. Never put a Supabase `service_role` key in browser JavaScript.

## Important database notes
- The code assumes `profiles` exists and has `id` and `role`; the Users/Sellers view reads `profiles`.
- Seller role is `vendor` (not `seller`).
- Dashboard order count checks `orders`.
- Other modules are intentionally not wired to guessed tables. Confirm the actual ZUNE schema, columns, RLS policies and server-side RPCs before enabling mutations.
- Add/Suspend/Block/Delete/Verify/Badge actions must be implemented through secured server-side RPC/Edge Functions with reason, actor, timestamp, before/after and append-only audit record.
- Commission is displayed as 3% by default. Confirm the server-side calculation uses the same rate.
- This package does not include your existing `login.html`, seller pages, delivery-pricing module, dispute module, or database migrations.

## Troubleshooting
- If redirected to `login.html`, ensure the login page exists at the site root and Supabase Auth session is available.
- If a table count displays `—`, check the table name and Admin RLS policy in Supabase.
- If `profiles.role` is not `admin`, update the correct authorized Admin Mkuu profile using a secure backend process.
