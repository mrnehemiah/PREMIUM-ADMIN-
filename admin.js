(() => {
 'use strict';
 const $=s=>document.querySelector(s);const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;
 const authReady=window.ZUNE_SECURITY.requireAdmin();window.ZUNE_AUTH_READY=authReady;
 async function init(){
  try{const profile=await authReady;if(!profile)return;
   const display=profile.full_name||profile.email||'Admin Mkuu';['adminDisplayName','topAdminName','welcomeAdminName'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=display;});
   const av=$('#adminAvatar');if(av)av.textContent=display.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
   ui().toast('Umeingia kwenye ZUNE PREMIUM ADMIN.','success');
   document.dispatchEvent(new Event('zune:admin-refresh'));
   const health=$('#systemStatusText');if(health)health.textContent='Admin amethibitishwa';
  }catch(e){console.error(e);const msg=$('#globalMessage');if(msg){msg.hidden=false;msg.textContent=e.message||'Imeshindikana kuthibitisha Admin.';}ui().toast(e.message||'Admin access denied','error');}
 }
 function schemaNoticePages(){
  const pending={
   'badge-requests':'Schema ya verified badge requests haijawekwa kwenye package kwa sababu jina la jedwali na columns halijathibitishwa.',
   'badge-management':'Verified badge status ya profiles.is_verified inasomwa. Mabadiliko ya badge yatahitaji RPC salama ya backend.',
   categories:'Schema ya categories haijathibitishwa; hakuna INSERT/DELETE ya kubahatisha.',
   security:'Sehemu ya usalama inaonyesha access model. Matukio maalum yatahitaji security-events table.',
   'system-health':'Health check ya Supabase inategemea session na queries za dashboard.',database:'Database monitoring: tumia Supabase Dashboard kwa metrics za ndani; browser key haiwezi kusoma database internals.',backup:'Backup na recovery husimamiwa kupitia Supabase Dashboard/CLI, si frontend browser.',settings:'Mipangilio inayobadilisha sera itawezeshwa baada ya kuthibitisha settings table na RPC.'
  };
  Object.entries(pending).forEach(([id,msg])=>c().notice(id,msg));
 }
 function bindActions(){
  document.getElementById('globalSearch')?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=e.target.value.trim();if(!q)return;const page=/order/i.test(q)?'orders':/seller|duka/i.test(q)?'sellers':/product|bidhaa/i.test(q)?'products':'users';window.ZUNE_ROUTER.show(page);const target=document.querySelector(`[data-section="${page}"] input[type="search"], [data-section="${page}"] input`);if(target){target.value=q;target.dispatchEvent(new Event('input'));}});
  document.getElementById('addSellerBtn')?.addEventListener('click',()=>ui().toast('Kuongeza seller kunahitaji utaratibu wa backend unaobadilisha profiles.role kwa usalama.','warning'));
  document.getElementById('addCategoryBtn')?.addEventListener('click',()=>ui().toast('Tunahitaji kuthibitisha schema ya categories kabla ya kuhifadhi.','warning'));
  ['verifySellerBtn','suspendSellerBtn','blockSellerBtn','deleteSellerBtn','removeBadgeBtn'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>ui().toast('Hatua hii inahitaji RPC ya backend na audit record; haijawashwa ili kuzuia mabadiliko yasiyo salama.','warning')));
  document.getElementById('refreshDashboard')?.addEventListener('click',()=>document.dispatchEvent(new Event('zune:admin-refresh')));
  document.getElementById('saveMonthlyAuditBtn')?.addEventListener('click',()=>ui().toast('Checklist imehifadhiwa kwenye ukurasa huu pekee. Database persistence itahitaji audit/settings schema.','info'));
  const checks=[...document.querySelectorAll('[data-audit-item]')];const update=()=>{const done=checks.filter(x=>x.checked).length,pct=checks.length?Math.round(done/checks.length*100):0;const t=$('#auditProgressText'),b=$('#auditProgressBar');if(t)t.textContent=`${pct}% imekamilika (${done}/${checks.length})`;if(b)b.style.width=`${pct}%`;};checks.forEach(x=>x.addEventListener('change',update));update();
 }
 document.addEventListener('DOMContentLoaded',()=>{schemaNoticePages();bindActions();init();});
 window.ZUNE_ADMIN={refresh:()=>document.dispatchEvent(new Event('zune:admin-refresh'))};
})();
