(() => {
 'use strict';const c=()=>window.ZUNE_CORE,ui=()=>window.ZUNE_LAYOUT;let cache=[];
 async function load(){try{cache=await c().rows('profiles',500);const q=document.getElementById('usersRoleFilter')?.value||'';const st=document.getElementById('usersStatusFilter')?.value||'';const data=cache.filter(x=>(!q||x.role===q)&&(!st||String(x.account_status||'active').toLowerCase()===st));
 c().setRows('usersTableBody',data,[{key:'full_name',html:r=>ui().esc(r.full_name||r.name||r.email||r.id)},{key:'email'},{key:'phone_number'},{key:'role',html:r=>ui().status(r.role)},{key:'is_verified',html:r=>r.is_verified?'Verified':'—'},{key:'account_status',html:r=>ui().status(r.account_status||'active')},{key:'created_at',html:r=>ui().date(r.created_at)},{key:'id',html:r=>`<button class="secondary-btn" data-user-view="${ui().esc(r.id)}">Maelezo</button>`}]);
 c().setText('totalUsers',cache.length.toLocaleString());c().bindFilter('usersSearch','usersTableBody');
 }catch(e){c().error('usersTableBody',e);}}
 document.addEventListener('DOMContentLoaded',()=>{load();['usersRoleFilter','usersStatusFilter'].forEach(id=>document.getElementById(id)?.addEventListener('change',load));document.getElementById('usersTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-user-view]');if(!b)return;const u=cache.find(x=>String(x.id)===b.dataset.userView);if(u)ui().openModal({title:'Taarifa za mtumiaji',message:`${u.full_name||u.email||u.id}\nRole: ${u.role||'—'}\nSimu: ${u.phone_number||'—'}\nStatus: ${u.account_status||'—'}`,confirmText:'Funga',onConfirm:async()=>{}});});});
 document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='users')load();});document.addEventListener('zune:admin-refresh',load);
 window.ZUNE_USERS={load,get cache(){return cache;}};
})();
