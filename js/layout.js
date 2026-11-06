(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  function toast(message, type='info') {
    const host = $('#adminToastRegion'); if (!host) return;
    const el = document.createElement('div'); el.className = `admin-toast ${type}`; el.textContent = message;
    host.appendChild(el); setTimeout(() => el.remove(), 4200);
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function money(value) {
    const n = Number(value); return Number.isFinite(n) ? `TZS ${n.toLocaleString('en-TZ',{maximumFractionDigits:2})}` : '—';
  }
  function date(value) {
    if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleString('sw-TZ');
  }
  function status(value) {
    const s = String(value || 'unknown');
    const cls = /active|verified|approved|paid|delivered|resolved|complete/i.test(s) ? 'success' : /reject|block|suspend|fail|cancel/i.test(s) ? 'danger' : 'warning';
    return `<span class="badge-pill ${cls}">${esc(s)}</span>`;
  }
  function table(bodyId, rows, cols, empty='Hakuna taarifa zilizopatikana.') {
    const body = document.getElementById(bodyId); if (!body) return;
    if (!rows?.length) { body.innerHTML = `<tr><td colspan="${cols.length}" class="empty-state">${esc(empty)}</td></tr>`; return; }
    body.innerHTML = rows.map(row => `<tr>${cols.map(col => `<td>${col.render ? col.render(row) : esc(row[col.key])}</td>`).join('')}</tr>`).join('');
  }
  function exportTable(bodyId, filename) {
    const body = document.getElementById(bodyId); if (!body) return;
    const tableEl = body.closest('table'); if (!tableEl) return;
    const rows = [...tableEl.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(td => '"'+td.innerText.replace(/"/g,'""')+'"').join(','));
    const blob = new Blob(['\uFEFF'+rows.join('\n')], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`${filename}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  function openModal({title='Thibitisha kitendo', message='Una uhakika?', confirmText='Thibitisha', onConfirm, requireDelete=false}) {
    const modal=$('#adminModal'); if(!modal) return;
    $('#adminModalTitle').textContent=title; $('#adminModalMessage').textContent=message;
    $('#adminActionReason').value=''; $('#adminActionConfirmText').value='';
    const deleteLabel=modal.querySelector('label[for="adminActionConfirmText"]');
    const deleteInput=$('#adminActionConfirmText');
    if(deleteLabel) deleteLabel.hidden=!requireDelete; if(deleteInput) deleteInput.hidden=!requireDelete;
    $('#confirmAdminAction').textContent=confirmText;
    modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
    const btn=$('#confirmAdminAction');
    btn.onclick=async()=>{
      const reason=$('#adminActionReason').value.trim();
      if(!reason){toast('Sababu ya kitendo inahitajika.','warning');return;}
      if(requireDelete && deleteInput.value.trim()!=='DELETE'){toast('Andika DELETE kuthibitisha.','warning');return;}
      btn.disabled=true;
      try { await onConfirm?.(reason); closeModal(); }
      catch(e){toast(e.message||'Kitendo kimeshindwa.','error');}
      finally{btn.disabled=false;}
    };
  }
  function closeModal(){const m=$('#adminModal');m?.classList.remove('show');m?.setAttribute('aria-hidden','true');}
  document.addEventListener('DOMContentLoaded',()=>{
    $('#closeAdminModal')?.addEventListener('click',closeModal); $('#cancelAdminAction')?.addEventListener('click',closeModal);
    $('#adminModal')?.addEventListener('click',e=>{if(e.target.id==='adminModal')closeModal();});
    const name=window.ZUNE_ADMIN_PROFILE?.full_name||'Admin Mkuu';
    ['adminDisplayName','topAdminName','welcomeAdminName'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=name;});
    const year=$('#footerYear'); if(year)year.textContent=new Date().getFullYear();
    const dateEl=$('#currentDate'); if(dateEl)dateEl.textContent=new Intl.DateTimeFormat('sw-TZ',{dateStyle:'full'}).format(new Date());
    $('#adminLogoutBtn')?.addEventListener('click',()=>window.ZUNE_SECURITY?.signOut());
    $('#exportUsersBtn')?.addEventListener('click',()=>exportTable('usersTableBody','zune-users'));
    $('#exportAuditBtn')?.addEventListener('click',()=>exportTable('adminAuditLogsBody','zune-admin-audit'));
    $('#exportReportsBtn')?.addEventListener('click',()=>exportTable('ordersTableBody','zune-orders-report'));
  });
  window.ZUNE_LAYOUT={toast,esc,money,date,status,table,exportTable,openModal,closeModal};
})();
