(() => {
  'use strict';
  const titles={dashboard:'Dashboard',users:'Watumiaji',sellers:'Seller Management','seller-applications':'Maombi ya Seller','badge-requests':'Verified Badge Requests','badge-management':'Verified Badge Management',verification:'Verification Documents',products:'Bidhaa',categories:'Categories',orders:'Orders','delivery-pricing':'Delivery & Pricing',coupons:'Coupons & Promotions',announcements:'Matangazo',payments:'Payments',wallet:'Wallet & Commission',disputes:'Disputes & Complaints','support-tickets':'Support Tickets',reports:'Reports & Analytics','audit-logs':'Admin Audit Center','monthly-audit':'Ukaguzi wa Mwezi',security:'Security Center','system-health':'System Health',database:'Database Monitoring',backup:'Backup & Recovery',notifications:'Notifications',settings:'System Settings','seller-details':'Seller Details'};
  let current='dashboard';
  function show(page, updateHash=true){if(!titles[page])page='dashboard';current=page;
    document.querySelectorAll('[data-section]').forEach(el=>el.classList.toggle('active',el.dataset.section===page));
    document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    const title=document.getElementById('pageTitle');if(title)title.textContent=titles[page];document.title=`ZUNE PREMIUM ADMIN | ${titles[page]}`;
    if(updateHash && location.hash!==`#${page}`)history.pushState({page},'',`#${page}`);
    document.getElementById('adminSidebar')?.classList.remove('open');document.getElementById('sidebarBackdrop')?.classList.remove('show');
    document.dispatchEvent(new CustomEvent('zune:page-changed',{detail:{page}}));
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();show(el.dataset.page);}));
    window.addEventListener('hashchange',()=>show(location.hash.slice(1),false));window.addEventListener('popstate',()=>show(location.hash.slice(1),false));
    const toggle=()=>{const side=document.getElementById('adminSidebar');const open=side?.classList.toggle('open');document.getElementById('sidebarBackdrop')?.classList.toggle('show',!!open);};
    document.getElementById('menuToggle')?.addEventListener('click',toggle);document.getElementById('sidebarBackdrop')?.addEventListener('click',toggle);
    document.querySelectorAll('[data-seller-tab]').forEach(btn=>btn.addEventListener('click',()=>{const tab=btn.dataset.sellerTab;document.querySelectorAll('[data-seller-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('.seller-tab-content').forEach(x=>x.classList.toggle('active',x.id===`seller${tab[0].toUpperCase()}${tab.slice(1)}Tab`));document.dispatchEvent(new CustomEvent('zune:seller-detail-tab',{detail:{tab}}));}));
    document.getElementById('backToSellersBtn')?.addEventListener('click',()=>show('sellers'));
    show(location.hash.slice(1)||'dashboard',false);
  });
  window.ZUNE_ROUTER={show,get current(){return current;},titles};
})();
