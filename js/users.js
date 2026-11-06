(() => {
  'use strict';
  const c=()=>window.ZUNE_CORE, ui=()=>window.ZUNE_LAYOUT, db=()=>c().db();
  let page=0, pageSize=25, total=0, currentUser=null, overview=null, searchTimer=null;
  const $=id=>document.getElementById(id);
  const esc=v=>ui().esc(v??'—');
  const fmt=v=>v==null?'—':Number(v).toLocaleString('en-TZ');
  const money=v=>ui().money(v??0);
  const statusLabel=v=>({active:'Active',suspended:'Suspended',removed:'Removed (temporary)'}[String(v||'active')]||v||'—');
  const roleLabel=v=>({buyer:'Buyer',vendor:'Seller',admin:'Admin'}[v]||v||'—');
  async function rpc(name,args={}){if(window.ZUNE_AUTH_READY)await window.ZUNE_AUTH_READY;const {data,error}=await db().rpc(name,args);if(error)throw error;return data;}
  function setMetric(id,value){const el=$(id);if(el)el.textContent=fmt(value??0);}
  async function loadOverview(){overview=await rpc('admin_users_overview');Object.entries({totalUsers:'total_users',activeUsers:'active_users',suspendedUsers:'suspended_users',removedUsers:'removed_users',buyerUsers:'buyers',sellerUsers:'sellers',adminUsers:'admins',verifiedUsers:'verified_users',unverifiedUsers:'unverified_users',pendingSellerUsers:'pending_seller_applications',pendingVerificationUsers:'pending_verification_applications'}).forEach(([id,key])=>setMetric(id,overview?.[key]));}
  function filters(){return {p_search:$('usersSearch')?.value.trim()||null,p_role:$('usersRoleFilter')?.value||null,p_status:$('usersStatusFilter')?.value||null,p_limit:pageSize,p_offset:page*pageSize};}
  async function loadList(){
    const body=$('usersTableBody');if(body)body.innerHTML='<tr><td colspan="8" class="empty-state">Inapakia watumiaji...</td></tr>';
    const data=await rpc('admin_list_users',filters());const items=Array.isArray(data?.items)?data.items:[];total=Number(data?.total||0);
    ui().table('usersTableBody',items,[
      {render:r=>`<div class="user-cell"><strong>${esc(r.full_name||r.email||r.id)}</strong><small>${esc(r.zune_id||r.id)}</small></div>`},
      {render:r=>esc(r.email)}, {render:r=>esc(r.phone_number)},
      {render:r=>`<span class="badge-pill ${r.role==='admin'?'warning':'success'}">${esc(roleLabel(r.role))}</span>`},
      {render:r=>r.is_verified?'<span class="badge-pill success">Verified</span>':'<span class="badge-pill">Unverified</span>'},
      {render:r=>`<span class="badge-pill ${r.account_status==='active'?'success':r.account_status==='suspended'?'danger':'warning'}">${esc(statusLabel(r.account_status))}</span>`},
      {render:r=>esc(ui().date(r.created_at))},
      {render:r=>`<button class="secondary-btn" type="button" data-user-view="${esc(r.id)}">Maelezo</button>`}
    ],'Hakuna mtumiaji anayelingana na vichujio.');
    setMetric('totalUsers',total);const range=$('usersPageInfo');if(range)range.textContent=total?`Inaonyesha ${page*pageSize+1}–${Math.min((page+1)*pageSize,total)} kati ya ${total}`:'Hakuna matokeo';
    const prev=$('usersPrevPage'),next=$('usersNextPage');if(prev)prev.disabled=page===0;if(next)next.disabled=(page+1)*pageSize>=total;
  }
  async function load(){try{await Promise.all([loadOverview(),loadList()]);}catch(e){c().error('usersTableBody',e);ui().toast(e.message||'Imeshindikana kupakia Users Management.','error');}}
  function section(title,content){return `<section class="user-detail-section"><h4>${title}</h4>${content}</section>`;}
  function rowsTable(items,cols,empty){if(!Array.isArray(items)||!items.length)return `<p class="users-muted">${empty}</p>`;return `<div class="table-wrap"><table><thead><tr>${cols.map(x=>`<th>${x[0]}</th>`).join('')}</tr></thead><tbody>${items.map(r=>`<tr>${cols.map(x=>`<td>${esc(typeof x[1]==='function'?x[1](r):r[x[1]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  function openDetails(data){
    const p=data.profile||{},m=data.metrics||{};currentUser=p;
    const host=$('usersDetailPanel');if(!host)return;
    const safeFields=[['Jina kamili',p.full_name],['Email',p.email],['Simu',p.phone_number],['ZUNE ID',p.zune_id],['Vendor code',p.vendor_code],['Role',roleLabel(p.role)],['Hali ya akaunti',statusLabel(p.account_status)],['Verification',p.is_verified?'Verified':'Unverified'],['Amesajiliwa',ui().date(p.created_at)],['Amesimamishwa',ui().date(p.suspended_at)],['Ameondolewa',ui().date(p.removed_at)]];
    const details=safeFields.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    const metricCards=[['Wallet balance',money(m.wallet_balance)],['Products',fmt(m.products)],['Buyer orders',fmt(m.buyer_orders)],['Seller orders',fmt(m.seller_orders)],['Payments',fmt(m.payments)],['Disputes',fmt(m.disputes)],['Support tickets',fmt(m.support_tickets)]];
    const metrics=metricCards.map(([k,v])=>`<article class="user-mini-metric"><small>${esc(k)}</small><strong>${esc(v)}</strong></article>`).join('');
    const isAdmin=p.role==='admin',isSelf=p.id===window.ZUNE_CURRENT_USER?.id;
    const actions=isAdmin||isSelf?'<p class="users-muted">Akaunti hii imelindwa dhidi ya mabadiliko kupitia ukurasa huu.</p>':`<div class="users-action-grid"><button class="warning-btn" data-user-action="suspended">Suspend</button><button class="secondary-btn" data-user-action="active">Restore</button><button class="danger-btn" data-user-action="removed">Temporary Remove</button><button class="secondary-btn" data-user-role="buyer" ${p.role==='buyer'?'disabled':''}>Badilisha kuwa Buyer</button><button class="secondary-btn" data-user-role="vendor" ${p.role==='vendor'?'disabled':''}>Badilisha kuwa Seller</button><button class="danger-btn" disabled title="Permanent removal inahitaji backend workflow maalumu na uthibitisho wa kisheria">Permanent Remove — haijawezeshwa</button></div>`;
    host.innerHTML=`<div class="users-detail-head"><div><p class="eyebrow">USER PROFILE</p><h3>${esc(p.full_name||p.email||p.id)}</h3><p>${esc(roleLabel(p.role))} · ${esc(p.id)}</p></div><button class="secondary-btn" id="closeUsersDetails">Funga</button></div>
      <div class="user-detail-grid">${details}</div><div class="user-mini-metrics">${metrics}</div>
      ${section('Account Control',actions)}
      ${section('Seller Applications',rowsTable(data.seller_applications,[['Hali','status'],['Tarehe','created_at']], 'Hakuna maombi ya Seller.'))}
      ${section('Verification Applications',rowsTable(data.verification_applications,[['Hali','status'],['Tarehe','created_at']], 'Hakuna maombi ya verification.'))}
      ${section('Verification Requests',rowsTable(data.verification_requests,[['Hali','status'],['Tarehe','created_at']], 'Hakuna verification requests.'))}
      ${section('Recent Orders',rowsTable(data.recent_orders,[['Bidhaa','product_title'],['Kiasi','total_price'],['Hali','status'],['Tarehe','created_at']], 'Hakuna orders.'))}
      ${section('Recent Products',rowsTable(data.recent_products,[['Bidhaa','title'],['Bei','price'],['Stock','stock_quantity']], 'Hakuna bidhaa.'))}
      ${section('Disputes & Support',rowsTable(data.disputes,[['Case','case_number'],['Aina','issue_type'],['Kiasi','amount'],['Hali','status']], 'Hakuna disputes.'))}
      ${section('Wallet Transactions',rowsTable(data.recent_wallet_transactions,[['Reference','reference'],['Aina','transaction_type'],['Kiasi','amount'],['Hali','status']], 'Hakuna wallet transactions.'))}
      ${section('Admin Actions & Audit',rowsTable([...(data.admin_actions||[]),...(data.admin_activity||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[['Kitendo','action'],['Sababu','reason'],['Tarehe','created_at']], 'Hakuna hatua za Admin zilizorekodiwa.'))}
      ${section('Login History & Devices','<p class="users-muted">Haijaunganishwa bado: hakuna login-history source iliyothibitishwa kwenye schema ya sasa. Hatutaonyesha taarifa za kubuni.</p>')}
      ${section('Advanced Risk Analysis','<p class="users-muted">Risk engine na risk-alert records bado hazijaunganishwa. Alama za hatari hazitatengenezwa bila data na kanuni zinazoweza kukaguliwa.</p>')}
      ${section('Custom Admin Permissions','<p class="users-muted">Role ya Admin ipo, lakini jedwali la custom permissions halijathibitishwa. Ruhusa za ziada hazitawashwa hadi backend/RLS na RPC zake ziwe tayari.</p>')}`;
    host.hidden=false;host.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function viewUser(id){try{const data=await rpc('admin_get_user_details',{p_user_id:id});openDetails(data||{});}catch(e){ui().toast(e.message||'Imeshindikana kupata taarifa za mtumiaji.','error');}}
  async function performStatus(status){const p=currentUser;if(!p)return;const reason=window.prompt(`Andika sababu ya ${statusLabel(status)} (angalau herufi 5):`);if(reason===null)return;if(reason.trim().length<5){ui().toast('Sababu lazima iwe na angalau herufi 5.','warning');return;}await rpc('admin_set_user_status',{target_user_id:p.id,new_status:status,action_reason:reason.trim()});ui().toast(`Hali ya akaunti imebadilishwa: ${statusLabel(status)}.`,'success');await viewUser(p.id);await load();}
  async function performRole(role){const p=currentUser;if(!p)return;const reason=window.prompt(`Sababu ya kubadilisha role kuwa ${roleLabel(role)} (angalau herufi 5):`);if(reason===null)return;if(reason.trim().length<5){ui().toast('Sababu lazima iwe na angalau herufi 5.','warning');return;}await rpc('admin_change_user_role',{p_user_id:p.id,p_new_role:role,p_reason:reason.trim()});ui().toast('Role imebadilishwa kwa mafanikio.','success');await viewUser(p.id);await load();}
  document.addEventListener('DOMContentLoaded',()=>{
    load();['usersRoleFilter','usersStatusFilter'].forEach(id=>$(id)?.addEventListener('change',()=>{page=0;loadList().catch(e=>c().error('usersTableBody',e));}));
    $('usersSearch')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=0;loadList().catch(e=>c().error('usersTableBody',e));},350);});
    $('usersPrevPage')?.addEventListener('click',()=>{if(page>0){page--;loadList().catch(e=>c().error('usersTableBody',e));}});$('usersNextPage')?.addEventListener('click',()=>{if((page+1)*pageSize<total){page++;loadList().catch(e=>c().error('usersTableBody',e));}});
    $('usersTableBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-user-view]');if(b)viewUser(b.dataset.userView);});
    $('usersDetailPanel')?.addEventListener('click',e=>{if(e.target.closest('#closeUsersDetails')){$('usersDetailPanel').hidden=true;currentUser=null;return;}const a=e.target.closest('[data-user-action]');if(a){performStatus(a.dataset.userAction).catch(err=>ui().toast(err.message||'Kitendo kimeshindwa.','error'));return;}const r=e.target.closest('[data-user-role]');if(r)performRole(r.dataset.userRole).catch(err=>ui().toast(err.message||'Role haikubadilishwa.','error'));});
  });
  document.addEventListener('zune:page-changed',e=>{if(e.detail.page==='users')load();});document.addEventListener('zune:admin-refresh',()=>{if(window.ZUNE_ROUTER?.current==='users')load();});
  window.ZUNE_USERS={load,viewUser,get overview(){return overview;}};
})();
