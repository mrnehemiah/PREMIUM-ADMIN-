(() => {
  'use strict';const C=()=>window.ZUNE_CORE;
  async function load(){const c=C();try{
    const [users,sellers,products,orders]=await Promise.all([
      c.count('profiles'),c.count('profiles',[['role','eq','vendor']]),c.count('products'),c.count('orders')
    ]);
    c.setText('totalUsers',users.toLocaleString());c.setText('totalSellers',sellers.toLocaleString());c.setText('totalProducts',products.toLocaleString());c.setText('totalOrders',orders.toLocaleString());
    c.setText('reportOrders',orders.toLocaleString());c.setText('reportCommission','TZS —');c.setText('totalCommission','TZS —');
    c.setText('totalRevenue','TZS —');c.setText('statSales','TZS —');
    try{const recent=await c.rows('orders',8);c.setRows('recentOrdersBody',recent,[{key:'id'},{key:'status',html:r=>window.ZUNE_LAYOUT.status(r.status)},{key:'created_at',html:r=>window.ZUNE_LAYOUT.date(r.created_at)}]);}catch(e){/* optional dashboard block */}
  }catch(e){c.notice('dashboard',`Takwimu hazijapakiwa: ${e.message}. Hakikisha profiles, products na orders zinaruhusu Admin SELECT.`);}}
  document.addEventListener('DOMContentLoaded',()=>{load();document.addEventListener('zune:admin-refresh',load);});
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='dashboard')load();});
  window.ZUNE_DASHBOARD={load};
})();
