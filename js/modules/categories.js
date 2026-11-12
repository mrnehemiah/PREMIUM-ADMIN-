(() => {
  const $ = (id) => document.getElementById(id);
  const state = { rows: [], products: [], view: 'grid', query: '', status: '', editing: null, busy: false };
  const client = () => window.zuneSupabase;
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slugify = (v) => String(v || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const date = (v) => v ? new Date(v).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '—';
  const toast = (m) => window.zuneToast ? window.zuneToast(m) : alert(m);
  const statusClass = (s) => `status ${esc(s || 'draft')}`;

  function setMode() {
    const live = !!(window.zuneIsLive && client());
    $('dataMode').textContent = live ? 'LIVE SUPABASE' : 'CONNECTION REQUIRED';
    $('connectionLabel').textContent = live ? 'LIVE SUPABASE' : 'OFFLINE';
  }
  function filtered() {
    const q = state.query.toLowerCase();
    return state.rows.filter(r => (!state.status || r.status === state.status) && (!q || [r.name,r.slug,r.description].some(x => String(x || '').toLowerCase().includes(q))));
  }
  function parentName(row) { return state.rows.find(x => x.id === row.parent_id)?.name || 'Root category'; }
  function countProducts(row) { return state.products.filter(p => p.category_id === row.id || (!p.category_id && String(p.category || '').toLowerCase() === row.name.toLowerCase())).length; }
  function render() {
    const rows = filtered();
    $('totalCount').textContent = state.rows.length;
    $('activeCount').textContent = state.rows.filter(r => ['active','approved'].includes(r.status)).length;
    $('pendingCount').textContent = state.rows.filter(r => r.status === 'pending').length;
    const last = state.rows.reduce((a,r) => !a || new Date(r.updated_at || r.created_at) > new Date(a) ? (r.updated_at || r.created_at) : a, null);
    $('updatedCount').textContent = last ? date(last) : '—';
    $('recordCount').textContent = `Showing ${rows.length} of ${state.rows.length} categories`;
    $('gridView').classList.toggle('hidden', state.view !== 'grid');
    $('tableView').classList.toggle('hidden', state.view !== 'table');
    $('gridToggle').classList.toggle('active-view', state.view === 'grid');
    $('tableToggle').classList.toggle('active-view', state.view === 'table');
    $('gridView').innerHTML = rows.length ? rows.map(r => `
      <article class="category-card">
        <div class="category-cover">${r.image_url ? `<img src="${esc(r.image_url)}" alt="${esc(r.name)}" loading="lazy">` : '<span class="category-placeholder">▧</span>'}<span class="${statusClass(r.status)}">${esc(r.status)}</span></div>
        <div class="category-card-body"><div class="category-card-title"><div><h3>${esc(r.name)}</h3><small>/${esc(r.slug)}</small></div><span class="category-order">#${Number(r.display_order)||0}</span></div>
        <p>${esc(r.description || 'No description added yet.')}</p><div class="category-meta"><span>↳ ${esc(parentName(r))}</span><b>${countProducts(r)} products</b></div>
        <div class="category-actions"><button class="mini-btn" data-action="view" data-id="${r.id}">View</button><button class="mini-btn" data-action="edit" data-id="${r.id}">Edit</button><button class="mini-btn danger-btn" data-action="delete" data-id="${r.id}">Delete</button></div></div>
      </article>`).join('') : '<div class="empty-state">No categories match your search. Add a category to get started.</div>';
    $('tableBody').innerHTML = rows.length ? rows.map(r => `<tr><td><div class="table-category">${r.image_url ? `<img src="${esc(r.image_url)}" alt="">` : '<span>▧</span>'}<div><b>${esc(r.name)}</b><small>${esc(r.description || '')}</small></div></div></td><td>${esc(r.slug)}</td><td>${esc(parentName(r))}</td><td>${countProducts(r)}</td><td><span class="${statusClass(r.status)}">${esc(r.status)}</span></td><td>${date(r.created_at)}</td><td><div class="row-actions"><button class="mini-btn" data-action="view" data-id="${r.id}">View</button><button class="mini-btn" data-action="edit" data-id="${r.id}">Edit</button><button class="mini-btn danger-btn" data-action="delete" data-id="${r.id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="7" class="empty-state">No categories found.</td></tr>';
  }
  async function load() {
    if (!window.zuneIsLive || !client()) { setMode(); $('gridView').innerHTML = '<div class="empty-state">Supabase connection is not enabled. Check js/config.js and sign in with an administrator account.</div>'; $('tableBody').innerHTML = '<tr><td colspan="7" class="empty-state">Supabase connection required.</td></tr>'; return; }
    setMode(); $('refreshBtn').disabled = true;
    try {
      const [cats, products] = await Promise.all([
        client().from('categories').select('*').order('display_order',{ascending:true}).order('name',{ascending:true}).limit(1000),
        client().from('products').select('id,category,category_id').limit(5000)
      ]);
      if (cats.error) throw cats.error;
      if (products.error && !/category_id|column/i.test(products.error.message || '')) throw products.error;
      state.rows = cats.data || []; state.products = products.data || [];
      render();
    } catch (e) { console.error(e); toast(`Could not load categories: ${e.message || e}`); }
    finally { $('refreshBtn').disabled = false; }
  }
  function openModal(row = null, readOnly = false) {
    state.editing = row;
    const options = state.rows.filter(x => x.id !== row?.id).map(x => `<option value="${x.id}" ${row?.parent_id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    $('modalHost').innerHTML = `<div class="modal-backdrop" id="categoryBackdrop"><div class="modal category-modal"><div class="modal-head"><div><p class="eyebrow">CATEGORY WORKSPACE</p><h3>${readOnly ? 'Category details' : row ? 'Edit category' : 'Create category'}</h3></div><button class="icon-btn" id="closeCategory">×</button></div>
      ${readOnly ? `<div class="detail-image">${row.image_url ? `<img src="${esc(row.image_url)}" alt="">` : '▧'}</div><div class="detail-grid"><div><small>Category</small><b>${esc(row.name)}</b></div><div><small>Slug</small><b>${esc(row.slug)}</b></div><div><small>Parent</small><b>${esc(parentName(row))}</b></div><div><small>Status</small><b>${esc(row.status)}</b></div><div><small>Products</small><b>${countProducts(row)}</b></div><div><small>Created</small><b>${date(row.created_at)}</b></div></div><p class="detail-description">${esc(row.description || 'No description.')}</p><div class="modal-actions"><button class="btn btn-ghost" id="closeDetail">Close</button><button class="btn btn-primary" id="editFromDetail">Edit category</button></div>` : `
      <form id="categoryForm"><div class="modal-grid">
        <div class="field"><label>Category name *</label><input name="name" id="categoryName" required maxlength="100" value="${esc(row?.name || '')}" placeholder="e.g. Electronics"></div>
        <div class="field"><label>URL slug *</label><input name="slug" id="categorySlug" required maxlength="120" value="${esc(row?.slug || '')}" placeholder="electronics"></div>
        <div class="field full-field"><label>Description</label><textarea name="description" maxlength="1000" placeholder="Describe this category">${esc(row?.description || '')}</textarea></div>
        <div class="field"><label>Parent category</label><select name="parent_id"><option value="">No parent (top-level)</option>${options}</select></div>
        <div class="field"><label>Status</label><select name="status">${['active','pending','approved','rejected','suspended','draft'].map(s=>`<option value="${s}" ${row?.status === s || (!row && s === 'active') ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>
        <div class="field"><label>Display order</label><input type="number" name="display_order" min="0" step="1" value="${Number(row?.display_order)||0}"></div>
        <div class="field"><label>Category image (max 5MB)</label><input type="file" name="image" id="categoryImage" accept="image/jpeg,image/png,image/webp,image/avif"><small class="field-hint">JPG, PNG, WEBP or AVIF</small></div>
        <div class="field"><label>SEO title</label><input name="seo_title" maxlength="160" value="${esc(row?.seo_title || '')}"></div>
        <div class="field full-field"><label>SEO description</label><textarea name="seo_description" maxlength="320">${esc(row?.seo_description || '')}</textarea></div>
      </div><p class="form-error" id="categoryError"></p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancelCategory">Cancel</button><button type="submit" class="btn btn-primary" id="saveCategory">${row ? 'Save changes' : 'Create category'}</button></div></form>`}
      </div></div>`;
    $('closeCategory').onclick = closeModal;
    if (readOnly) { $('closeDetail').onclick = closeModal; $('editFromDetail').onclick = () => openModal(row); return; }
    $('cancelCategory').onclick = closeModal;
    $('categoryName').addEventListener('input', e => { if (!$('categorySlug').dataset.touched) $('categorySlug').value = slugify(e.target.value); });
    $('categorySlug').addEventListener('input', () => $('categorySlug').dataset.touched = '1');
    $('categoryForm').addEventListener('submit', saveCategory);
  }
  function closeModal() { $('modalHost').innerHTML = ''; state.editing = null; }
  async function saveCategory(e) {
    e.preventDefault(); if (state.busy) return;
    const form = e.currentTarget, fd = new FormData(form), name = String(fd.get('name')||'').trim(), slug = slugify(fd.get('slug'));
    const errorEl = $('categoryError');
    if (!name || !slug) { errorEl.textContent = 'Category name and valid slug are required.'; return; }
    const parent = fd.get('parent_id') || null;
    if (parent && state.editing && parent === state.editing.id) { errorEl.textContent = 'A category cannot be its own parent.'; return; }
    state.busy = true; $('saveCategory').disabled = true; $('saveCategory').textContent = 'Saving…'; errorEl.textContent = '';
    try {
      const user = (await client().auth.getUser()).data.user;
      const patch = {name,slug,description:String(fd.get('description')||'').trim()||null,parent_id:parent,status:fd.get('status'),display_order:Number(fd.get('display_order'))||0,seo_title:String(fd.get('seo_title')||'').trim()||null,seo_description:String(fd.get('seo_description')||'').trim()||null,updated_by:user?.id||null};
      const file = fd.get('image');
      if (file && file.size) {
        if (file.size > 5*1024*1024) throw new Error('Image must be 5MB or smaller.');
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error('Unsupported image format.');
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
        const up = await client().storage.from('zune-categories').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
        if (up.error) throw up.error;
        patch.image_url = client().storage.from('zune-categories').getPublicUrl(path).data.publicUrl;
      }
      if (state.editing) {
        const {error} = await client().from('categories').update(patch).eq('id',state.editing.id); if (error) throw error;
      } else {
        patch.created_by = user?.id || null;
        const {error} = await client().from('categories').insert(patch); if (error) throw error;
      }
      try { await client().from('admin_activity_logs').insert({action:state.editing?'category_updated':'category_created',entity:'categories',details:{name,slug}}); } catch (_) { /* audit table is optional in older deployments */ }
      const wasEdit = !!state.editing; closeModal(); toast(wasEdit ? 'Category updated successfully.' : 'Category created successfully.'); await load();
    } catch (err) { errorEl.textContent = err.message || 'Unable to save category.'; }
    finally { state.busy = false; const b = $('saveCategory'); if (b) { b.disabled = false; b.textContent = state.editing ? 'Save changes' : 'Create category'; } }
  }
  async function removeCategory(id) {
    const row = state.rows.find(x => x.id === id); if (!row) return;
    try {
      const [childCheck, linkedCheck, legacyCheck] = await Promise.all([
        client().from('categories').select('id',{count:'exact',head:true}).eq('parent_id',id),
        client().from('products').select('id',{count:'exact',head:true}).eq('category_id',id),
        client().from('products').select('id',{count:'exact',head:true}).is('category_id',null).ilike('category',row.name)
      ]);
      if (childCheck.error) throw childCheck.error; if (linkedCheck.error) throw linkedCheck.error; if (legacyCheck.error) throw legacyCheck.error;
      const children = childCheck.count || 0, products = (linkedCheck.count || 0) + (legacyCheck.count || 0);
      if (children || products) { toast(`Cannot delete: this category has ${children} subcategories and ${products} linked products. Reassign them first.`); return; }
    } catch (e) { toast(`Could not verify category dependencies: ${e.message || e}`); return; }
    if (!confirm(`Delete category “${row.name}”? This cannot be undone.`)) return;
    try { const {error} = await client().from('categories').delete().eq('id',id); if (error) throw error; toast('Category deleted.'); await load(); }
    catch(e) { toast(`Delete failed: ${e.message || e}`); }
  }
  function exportCSV() {
    const rows = filtered(), cols = ['name','slug','description','parent','status','display_order','products','created_at'];
    const quote = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const body = [cols.join(','), ...rows.map(r => [r.name,r.slug,r.description,parentName(r),r.status,r.display_order,countProducts(r),r.created_at].map(quote).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff'+body],{type:'text/csv;charset=utf-8;'})); const a=document.createElement('a');a.href=url;a.download='zune-categories.csv';a.click();URL.revokeObjectURL(url);
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('gridToggle').addEventListener('click',()=>{state.view='grid';render();}); $('tableToggle').addEventListener('click',()=>{state.view='table';render();});
    $('addBtn').addEventListener('click',()=>openModal()); $('refreshBtn').addEventListener('click',load); $('exportBtn').addEventListener('click',exportCSV);
    $('searchBox').addEventListener('input',e=>{state.query=e.target.value;render();}); $('statusFilter').addEventListener('change',e=>{state.status=e.target.value;render();});
    document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const row=state.rows.find(x=>x.id===b.dataset.id);if(!row)return;if(b.dataset.action==='view')openModal(row,true);if(b.dataset.action==='edit')openModal(row);if(b.dataset.action==='delete')removeCategory(row.id);});
    load();
  });
})();
