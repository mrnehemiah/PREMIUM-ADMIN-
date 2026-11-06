(() => {
  'use strict';
  const db=()=>window.zuneSupabase, cfg=window.ZUNE_CONFIG||{}, ui=()=>window.ZUNE_LAYOUT;
  async function rows(table, limit=200, order='created_at'){
    if(window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
    if(!db())throw new Error('Supabase haijaunganishwa.');
    let q=db().from(table).select('*').limit(limit);
    if(order)q=q.order(order,{ascending:false});
    let r=await q;
    if(r.error && /column .* does not exist|could not find the .* column/i.test(r.error.message||''))r=await db().from(table).select('*').limit(limit);
    if(r.error)throw r.error;return r.data||[];
  }
  async function count(table, filters=[]){if(window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;let q=db().from(table).select('*',{count:'exact',head:true});filters.forEach(([col,op,val])=>q=q[op](col,val));const r=await q;if(r.error)throw r.error;return r.count??0;}
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
  function setRows(id,data,columns,empty='Hakuna taarifa zilizopatikana.'){
    const body=document.getElementById(id);if(!body)return;
    if(!data?.length){body.innerHTML=`<tr><td colspan="${columns.length}" class="empty-state">${ui().esc(empty)}</td></tr>`;return;}
    body.innerHTML=data.map(row=>`<tr>${columns.map(c=>`<td>${c.html?c.html(row):ui().esc(row[c.key]??'—')}</td>`).join('')}</tr>`).join('');
  }
  function error(id,e){const el=document.getElementById(id);if(el)el.innerHTML=`<tr><td colspan="12" class="empty-state">Imeshindikana kupakia data: ${ui().esc(e.message||e)}</td></tr>`;console.warn('ZUNE data error',e);}
  function notice(section,message){const el=document.querySelector(`[data-section="${section}"]`);if(!el)return;let n=el.querySelector('.schema-note');if(!n){n=document.createElement('div');n.className='notice-box schema-note';el.appendChild(n);}n.textContent=message;}
  async function audit(action,targetType,targetId,reason,details={}){
    const user=window.ZUNE_CURRENT_USER;if(!db()||!user)return;
    const payload={actor_id:user.id,action,target_type:targetType||null,target_id:targetId==null?null:String(targetId),reason:String(reason||'Sababu haijaainishwa'),details};
    const {error:e}=await db().from(cfg.TABLES.activityLogs||'admin_activity_logs').insert(payload);
    if(e)console.warn('Audit log haikuandikwa:',e.message);
  }
  function bindFilter(inputId,bodyId){const input=document.getElementById(inputId),body=document.getElementById(bodyId);if(!input||!body||input.dataset.bound)return;input.dataset.bound='1';input.addEventListener('input',()=>{const q=input.value.toLowerCase().trim();body.querySelectorAll('tr').forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q));});}
  window.ZUNE_CORE={db,cfg,rows,count,setText,setRows,error,notice,audit,bindFilter};
})();
