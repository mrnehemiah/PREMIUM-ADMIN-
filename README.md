# ZUNE PREMIUM ADMIN — build mpya

Package hii ina muundo wa Admin Mkuu uliokubaliwa:
- Sidebar ya kudumu kwenye desktop; sidebar inayoteleza kwenye simu (haijaondolewa).
- Bottom navigation ya simu: Home, Users, Sellers, Orders na More/Notifications.
- Top navigation yenye global search, profile na notification bell.
- SPA routing: kila kipengee cha navigation kinafungua page section yake na URL hash yake; back/forward na refresh huhifadhi page.
- Notification Center yenye unread badge, preview dropdown, mark-as-read na Supabase Realtime.
- Admin role check dhidi ya `profiles.role = 'admin'`.
- Seller role ni `vendor`; buyer role ni `buyer`.
- Seller details profile ina sehemu za taarifa za mtu/duka, verification, activity, orders, products, wallet, disputes na security.
- Commission policy ya ZUNE ni 3%; hesabu ya mapato haibuniwi bila kuthibitisha amount/payment schema.
- Audit log table append-only kwa RLS na trigger ya kuzuia UPDATE/DELETE.

## Muundo

```text
ZUNE_PREMIUM_ADMIN/
├── index.html
├── login.html
├── admin.js
├── README.md
├── css/admin.css
├── js/
│   ├── config.js
│   ├── login.js
│   ├── security.js
│   ├── layout.js
│   ├── router.js
│   ├── core.js
│   ├── dashboard.js
│   ├── users.js
│   ├── sellers.js
│   ├── products.js
│   ├── orders.js
│   ├── wallet.js
│   ├── transactions.js
│   ├── disputes.js
│   ├── delivery-pricing.js
│   ├── notifications.js
│   ├── reports.js
│   └── activity-logs.js
└── sql/01_admin_notifications_and_audit.sql
```

## Kuweka kwenye hosting

1. Upload folder contents kwenye sehemu ya admin ya hosting yako; usiweke `index.html` ndani ya subfolder tofauti na `css/` na `js/`.
2. Supabase URL na publishable key tayari zimewekwa kwenye `js/config.js` kulingana na taarifa ulizotuma. Publishable key ni salama kuwekwa frontend; USIWEKE `service_role` key hapa.
3. Fungua Supabase Dashboard → SQL Editor, kisha run `sql/01_admin_notifications_and_audit.sql`.
4. Hakikisha `profiles` ina row ya akaunti ya msimamizi yenye `role='admin'`. Login hutumia Supabase Auth email/password.
5. Hakikisha RLS ya marketplace tables inaruhusu Admin SELECT. Package haitazima RLS wala kubadilisha policies zilizopo.
6. Deploy site kupitia HTTPS.

## Data tables zinazotumiwa

| Module | Table / source | Hali |
|---|---|---|
| Users & Sellers | `profiles` | Inasoma `select *`; seller ni `role='vendor'` |
| Seller applications | `seller_applications` | Table ipo kwenye seller application code ya mradi; schema ya columns haibadilishwi |
| Products | `products` | Inasoma records; columns zisizojulikana huonyeshwa kwa fallback |
| Orders | `orders` | Inasoma records; totals huonyeshwa tu kama amount column inapatikana |
| Wallet | `admin_wallet_transactions` | Jina la table limetumika kwenye code iliyokuwepo; hakiki RLS |
| Disputes | `transaction_disputes` | Jina la table limetumika kwenye code iliyokuwepo; hakiki RLS |
| Notifications | `admin_notifications` | Hutengenezwa na SQL migration hii |
| Admin Activity | `admin_activity_logs` | Hutengenezwa na SQL migration hii |

## Notifications za matukio ya wateja

Notification center hupokea rows kutoka `admin_notifications` na kusikiliza Realtime. SQL migration ina function `zune_create_admin_notification(...)` inayopatikana kwa `service_role` pekee. Backend/Edge Function au database trigger inayojua schema halisi ya event inapaswa kuiita baada ya tukio kufanikiwa, mfano seller application, product submitted, order created, withdrawal request au dispute opened. Hii imeachwa upande wa trusted backend kwa makusudi; hatujabuni columns/triggers kwenye tables za wateja ambazo hatujaziona.

Mfano wa server-side call (usiweke service-role key kwenye browser):

```sql
select public.zune_create_admin_notification(
  'Maombi mapya ya Seller',
  'Seller mpya ametuma ombi la kujiunga.',
  'seller_application', 'high',
  'seller_applications', 'APPLICATION_UUID',
  'seller-applications', '{}'::jsonb
);
```

## Vitendo vinavyohitaji backend RPC

Buttons za kusimamisha/kuzuia/kufuta akaunti, kuidhinisha badge, kubadilisha role, kufanya payout/refund au kubadilisha fedha hazijaruhusiwa kuandika moja kwa moja kwenye tables kutoka browser. Zinaonyesha maelezo ya hatua inayohitajika hadi RPC/Edge Function salama ilinganishwe na schema ya Supabase. Hii inazuia kuharibu wallet, orders na foreign keys.

## Mambo ya kuthibitisha kabla ya kuwezesha modules zote

Schema kamili ya `products`, `orders`, `admin_wallet_transactions`, `transaction_disputes`, badge requests, verification documents, categories, delivery pricing, payments, coupons, announcements na support tickets haikupatikana pamoja na files tulizoweza kusoma. Modules hizo zina navigation na UI, lakini baadhi huonyesha ujumbe wa schema mapping badala ya kubuni columns au kuandika data isiyothibitishwa.


## ZUNE PREMIUM ADMIN 2.0 — visual upgrade

- Dark Emerald / Gold / Black visual system.
- Advanced page, card, modal, toast, hover and notification animations.
- Desktop collapsible sidebar with saved preference; mobile drawer and bottom navigation remain available.
- Premium Lucide icon set loaded from CDN; a text/emoji fallback remains in the original markup if the CDN is unavailable.
- Existing page modules and Supabase configuration retained from the supplied project archive.
- Added `css/premium-v2.css` and `js/premium-v2.js`; these are enhancement layers, not replacements for the existing business modules.

### Deployment
1. Back up the current admin folder.
2. Extract this ZIP and deploy the contents of `ZUNE_PREMIUM_ADMIN/` preserving folder paths.
3. Confirm `js/config.js` contains the correct Supabase project URL and publishable key. Never put a service-role key in browser code.
4. Run `sql/01_admin_notifications_and_audit.sql` in Supabase SQL Editor only after reviewing it against the current schema. The admin role check uses `p.role::text = 'admin'` for ENUM compatibility.
5. Test login, navigation, notifications, verification, seller details and all data pages with an Admin account.

Note: New navigation/visual enhancements do not create missing business tables or invent database schemas. Pages whose underlying table is not configured will continue to show their existing connection/schema notice.

## Schema mapping iliyothibitishwa kwenye ZUNE

Muunganisho wa sasa umetumia majina/columns yaliyopo kwenye project:
- `profiles`: `full_name`, `phone_number`, `role`, `is_verified`, `account_status`.
- `orders`: `buyer_id`, `product_id`, `quantity`, `total_price`, `commission_fee`, `status`, `payment_status`.
- `products`: `vendor_id`, `title`, `price`, `stock_quantity`, `is_featured`.
- `payments`: `transaction_reference`, `buyer_id`, `amount`, `payment_method`, `payment_status`.
- `admin_wallet_transactions`: `reference`, `user_id`, `transaction_type`, `amount`, `status`.
- `transaction_disputes`: `case_number`, `order_id`, `opened_by`, `issue_type`, `amount`, `status`.
- `delivery_pricing`, `coupons`, `admin_announcements`, `support_tickets`, `verification_requests`.

`admin_notifications` na `admin_activity_logs` zimeundwa kwenye project iliyounganishwa. Module ya notifications husoma `admin_notifications`, huweka alama ya read na kusikiliza Realtime. Audit module husoma `admin_activity_logs`; audit writes hufanywa kupitia `ZUNE_CORE.audit(...)` kutoka vitendo vya admin vinavyowezeshwa na backend.

Muhimu: buttons za mabadiliko hatarishi (kufuta/ku-block akaunti, kuidhinisha seller, payout/refund na kubadilisha role) bado hazijawezeshwa kwa direct browser writes. Zihitaji RPC/Edge Functions zenye uthibitisho wa Admin Mkuu, reason, na audit log ya server-side. Usiongeze service-role key kwenye frontend.
