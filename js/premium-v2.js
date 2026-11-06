/* ZUNE PREMIUM ADMIN 2.0 interaction layer: collapsible navigation + premium icons */
(() => {
  'use strict';
  const body = document.body;
  const sidebar = document.getElementById('adminSidebar');
  const toggle = document.getElementById('sidebarCollapseBtn');
  const key = 'zune_admin_sidebar_collapsed_v2';
  const icons = {
    dashboard:'layout-dashboard',users:'users',sellers:'store', 'seller-applications':'file-check',
    'badge-requests':'badge-check','badge-management':'shield-check',verification:'shield-check',
    products:'package',categories:'tags',orders:'shopping-bag','delivery-pricing':'truck',
    coupons:'ticket-percent',announcements:'megaphone',payments:'credit-card',wallet:'wallet',
    disputes:'scale', 'support-tickets':'headset',reports:'chart-no-axes-combined','audit-logs':'clipboard-list',
    'monthly-audit':'calendar-check',security:'shield-alert','system-health':'activity',database:'database',
    backup:'hard-drive-download',notifications:'bell',settings:'settings'
  };
  const renderIcons = () => {
    document.querySelectorAll('.side-nav .nav-link[data-page]').forEach(a => {
      const name = icons[a.dataset.page] || 'circle';
      const holder = a.querySelector('.nav-icon');
      if (holder) { holder.innerHTML = `<i data-lucide="${name}"></i>`; a.setAttribute('aria-label', a.textContent.trim()); }
      if (!a.querySelector('.nav-label')) {
        const text = [...a.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent.trim()).filter(Boolean).join(' ');
        if (text) { [...a.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => n.textContent=''); const label=document.createElement('span'); label.className='nav-label'; label.textContent=text; a.append(label); }
      }
    });
    document.querySelectorAll('.bottom-nav a').forEach(a=>{const page=a.dataset.page;const icon=icons[page]||'circle';const holder=a.querySelector('span');if(holder)holder.innerHTML=`<i data-lucide="${icon}"></i>`;});
    if (window.lucide?.createIcons) window.lucide.createIcons({attrs:{'stroke-width':1.8}});
  };
  const setCollapsed = value => {
    body.classList.toggle('zune-sidebar-collapsed', value);
    if (toggle) {
      const label=toggle.querySelector('.collapse-label');
      if(label) label.textContent=value?'Panua menyu':'Kunja menyu';
      toggle.setAttribute('aria-expanded',String(!value));
      toggle.innerHTML=`<span>${value?'⟫':'⟪'}</span><span class="collapse-label">${value?'Panua menyu':'Kunja menyu'}</span>`;
    }
    try { localStorage.setItem(key,value?'1':'0'); } catch (_) {}
  };
  let saved=false;try{saved=localStorage.getItem(key)==='1'}catch(_){}
  if (window.matchMedia('(min-width: 761px)').matches) setCollapsed(saved);
  toggle?.addEventListener('click',()=>setCollapsed(!body.classList.contains('zune-sidebar-collapsed')));
  renderIcons();
  document.addEventListener('zune:page-changed',()=>{renderIcons();if(window.matchMedia('(max-width: 760px)').matches){sidebar?.classList.remove('open');document.getElementById('sidebarBackdrop')?.classList.remove('show');}});
  document.addEventListener('DOMContentLoaded',renderIcons);
  // Give icon-only action buttons accessible labels and subtle motion.
  document.querySelectorAll('button.icon-btn').forEach(b=>{if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',b.title||'Kitendo');});
})();
