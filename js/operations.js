(() => {
'use strict'; const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT;
async function coupons(){try{const a=await c().rows('coupons',300);c().setRows('couponsTableBody',a,[{key:'code'},{key:'discount_value',html:x=>`${ui().esc(x.discount_value)} ${ui().esc(x.discount_type||'')}`},{key:'expires_at',html:x=>ui().date(x.expires_at)},{key:'usage_count',html:x=>`${x.usage_count||0} / ${x.usage_limit??'∞'}`},{key:'status',html:x=>ui().status(x.status)},{key:'id',html:x=>ui().esc(x.id)}]);}catch(e){c().error('couponsTableBody',e);}}
async function announcements(){try{const a=await c().rows('admin_announcements',300);c().setRows('announcementsTableBody',a,[{key:'title'},{key:'audience'},{key:'created_at',html:x=>ui().date(x.created_at)},{key:'status',html:x=>ui().status(x.status)},{key:'priority'}]);}catch(e){c().error('announcementsTableBody',e);}}
async function support(){try{const a=await c().rows('support_tickets',300);c().setRows('supportTicketsBody',a,[{key:'id'},{key:'customer_name'},{key:'category'},{key:'message',html:x=>ui().esc(x.message||'').slice(0,120)},{key:'status',html:x=>ui().status(x.status)},{key:'created_at',html:x=>ui().date(x.created_at)}]);}catch(e){c().error('supportTicketsBody',e);}}
async function verification(){try{const a=await c().rows('verification_requests',300);c().setRows('verificationTableBody',a,[{key:'user_id'},{key:'document_type'},{key:'document_number'},{key:'created_at',html:x=>ui().date(x.created_at)},{key:'status',html:x=>ui().status(x.status)},{key:'admin_note'}]);}catch(e){c().error('verificationTableBody',e);}}
const loaders={coupons,announcements,'support-tickets':support,verification};
document.addEventListener('DOMContentLoaded',()=>Object.values(loaders).forEach(fn=>fn()));
document.addEventListener('zune:page-changed',e=>loaders[e.detail.page]?.());
window.ZUNE_OPERATIONS={coupons,announcements,support,verification};
})();
