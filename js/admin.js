/* ZUNE PREMIUM ADMIN — dashboard data and module views
   Schema note: profiles, products and orders are common table names. Other modules
   remain preview-only until their actual table/RPC names are configured and verified.
   Never perform privileged mutations directly from the browser.
*/
(() => {
  "use strict";
  const C = window.ZUNE_CONFIG || {};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sb = () => window.zuneSupabase;
  const fmt = n => Number(n || 0).toLocaleString("en-US");
  const statusClass = s => /active|verified|approved|complete|delivered/i.test(String(s)) ? "status-good" :
    /suspend|reject|block|cancel|fail/i.test(String(s)) ? "status-bad" : "status-warn";
  const status = s => `<span class="status ${statusClass(s)}">${esc(s || "Unknown")}</span>`;
  const statCard = (label,value) => `<article class="stat-card"><small>${esc(label)}</small><strong>${esc(value)}</strong></article>`;
  const panel = (title,body) => `<div class="preview-panel"><h3>${title}</h3>${body}</div>`;
  const empty = msg => `<div class="empty-box">${esc(msg)}</div>`;
  let cachedProfiles = [];
  let modalAction = null;

  async function count(table, filters=[]) {
    const client = sb(); if (!client) return null;
    let q = client.from(table).select("*",{count:"exact",head:true});
    filters.forEach(([col,op,val]) => q = q[op](col,val));
    const {count,error} = await q;
    if (error) { console.warn(`ZUNE count ${table}:`,error.message); return null; }
    return count ?? 0;
  }
  async function getProfiles() {
    const client = sb(); if (!client) return [];
    const {data,error} = await client.from("profiles").select("*").order("created_at",{ascending:false}).limit(150);
    if (error) { console.warn("profiles:",error.message); return []; }
    cachedProfiles = data || []; return cachedProfiles;
  }
  async function refreshOverview() {
    if (!sb()) return;
    const [users,sellers,orders] = await Promise.all([
      count("profiles"),
      count("profiles",[["role","eq","vendor"]]),
      count("orders")
    ]);
    $("#statUsers").textContent = users === null ? "—" : fmt(users);
    $("#statSellers").textContent = sellers === null ? "—" : fmt(sellers);
    $("#statOrders").textContent = orders === null ? "—" : fmt(orders);
    $("#statSales").textContent = "—";
  }
  function overview(title,desc) {
    $("#modulePreview").innerHTML = `<h2>${title}</h2><p>${desc}</p>
      <div class="stat-grid">${statCard("Watumiaji wote",$("#statUsers")?.textContent||"—")}
      ${statCard("Sellers",$("#statSellers")?.textContent||"—")}${statCard("Orders zote",$("#statOrders")?.textContent||"—")}
      ${statCard("Commission",`${(Number(C.COMMISSION_RATE ?? .03)*100).toFixed(0)}%`)}</div>
      ${panel("Marketplace Performance",`<p class="muted">Muhtasari unaonyesha takwimu zinazopatikana kwenye Supabase. Mauzo yataunganishwa baada ya kuthibitisha jedwali na safu za orders/payments.</p>`)}
      ${panel("Admin Mkuu",`<p class="muted">Mamlaka ya kiutawala yanapaswa kuthibitishwa server-side. Kila mabadiliko nyeti yahitaji sababu na audit record isiyoweza kuhaririwa na browser.</p>`)}`;
  }
  function userName(p) { return p.full_name || p.name || p.store_name || p.email || p.id || "User"; }
  function renderUsers(title,desc) {
    const rows = cachedProfiles.map(p => `<article class="record-card">
      <div class="record-main"><div class="record-avatar">${esc(userName(p).slice(0,1).toUpperCase())}</div>
      <div class="record-info"><b>${esc(userName(p))}</b><small>${esc(p.email||p.phone||p.id||"")}</small></div>
      ${status(p.status || (p.is_verified ? "Verified" : p.role || "Active"))}</div>
      <div class="record-meta"><span>Role: ${esc(p.role||"—")}</span><span>${esc(p.phone||"")}</span></div>
      <button class="text-action" data-view-user="${esc(p.id)}">Angalia maelezo →</button></article>`).join("");
    $("#modulePreview").innerHTML = `<h2>${title}</h2><p>${desc}</p>
      <div class="stat-grid">${statCard("Jumla ya Users",fmt(cachedProfiles.length))}${statCard("Verified",fmt(cachedProfiles.filter(p=>p.is_verified===true).length))}</div>
      <input class="search-input" id="recordSearch" placeholder="Tafuta jina, simu, email au User ID...">
      <h3 class="list-heading">Orodha ya Watumiaji</h3><div id="recordList">${rows || empty("Hakuna data iliyopatikana. Hakikisha profiles table na RLS zimeruhusu SELECT.")}</div>`;
    $("#recordSearch")?.addEventListener("input",e=>{$$("#recordList .record-card").forEach(card=>card.hidden=!card.textContent.toLowerCase().includes(e.target.value.toLowerCase()));});
  }
  function renderSellers(title,desc) {
    const sellers = cachedProfiles.filter(p => p.role === "vendor");
    const active = sellers.filter(p => !/suspend|block/i.test(p.status||"")).length;
    const rows = sellers.map(p => `<article class="record-card">
      <div class="record-main"><div class="record-avatar">♧</div><div class="record-info"><b>${esc(p.store_name||p.full_name||p.name||"Seller")}</b><small>${esc(p.seller_id||p.id||"")}</small></div>${status(p.status||"Active")}</div>
      <div class="record-meta"><span>Seller account</span><span>${p.is_verified ? '<span class="verified-badge">✓ Verified</span>' : "Not verified"}</span></div>
      <button class="text-action" data-view-user="${esc(p.id)}">Angalia maelezo →</button></article>`).join("");
    $("#modulePreview").innerHTML = `<div class="module-banner"><span>♧</span><div><h2>${title}</h2><p>${desc}</p></div><span class="admin-chip">Admin Mkuu</span></div>
      <div class="stat-grid">${statCard("Jumla ya Sellers",fmt(sellers.length))}${statCard("Active Sellers",fmt(active))}${statCard("Suspended",fmt(sellers.length-active))}${statCard("Pending","—")}</div>
      <input class="search-input" id="recordSearch" placeholder="Tafuta Seller kwa jina, simu, email au ID...">
      <h3 class="list-heading">All Sellers</h3><div id="recordList">${rows||empty("Hakuna seller aliyepatikana. Hakikisha profiles.role='vendor'.")}</div>
      <p class="muted small-note">Majina na takwimu ni data kutoka profiles. Suspend/Remove/Add vitahitaji RPC ya backend iliyothibitishwa kabla ya kuwezeshwa.</p>`;
    $("#recordSearch")?.addEventListener("input",e=>{$$("#recordList .record-card").forEach(card=>card.hidden=!card.textContent.toLowerCase().includes(e.target.value.toLowerCase()));});
  }
  function placeholder(title,desc) {
    $("#modulePreview").innerHTML = `<h2>${title}</h2><p>${desc}</p>
      ${panel("Module status",`<span class="status status-warn">Waiting for database mapping</span><p class="muted">Muonekano wa sehemu hii umeandaliwa. Ili kuonyesha au kubadilisha data, tunahitaji kuthibitisha majina halisi ya tables, columns, policies na RPC za Supabase za ZUNE.</p>`)}
      ${panel("Usalama wa Admin Mkuu",`<p class="muted">Vitendo nyeti havitawezeshwa kwa kubahatisha schema au kuandika moja kwa moja kwenye database kutoka browser. Kila kitendo lazima kiwe na reason na audit trail ya server.</p>`)}`;
  }
  async function renderModule(id,title,desc) {
    if (id === "overview") { overview(title,desc); return; }
    if (id === "users" || id === "sellers") {
      $("#modulePreview").innerHTML = `<h2>${title}</h2><p>Inapakia taarifa kutoka Supabase...</p>`;
      if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
      await getProfiles();
      if (id === "users") renderUsers(title,desc); else renderSellers(title,desc);
      return;
    }
    placeholder(title,desc);
  }
  function openAction(title,description,callback) {
    modalAction = callback;
    $("#modalTitle").textContent = title; $("#modalDescription").textContent = description;
    $("#actionReason").value = ""; $("#actionModal").classList.add("show");
    $("#actionModal").setAttribute("aria-hidden","false");
  }
  function closeModal() { $("#actionModal").classList.remove("show"); $("#actionModal").setAttribute("aria-hidden","true"); modalAction=null; }
  $("#modalClose")?.addEventListener("click",closeModal); $("#modalCancel")?.addEventListener("click",closeModal);
  $("#modalConfirm")?.addEventListener("click", async()=>{
    const reason=$("#actionReason").value.trim();
    if (!reason) { window.ZUNE_LAYOUT?.toast("Sababu inahitajika kabla ya kuendelea."); return; }
    if (modalAction) await modalAction(reason);
    closeModal();
  });
  $("#modulePreview")?.addEventListener("click",e=>{
    const btn=e.target.closest("[data-view-user]");
    if (btn) {
      const p=cachedProfiles.find(x=>String(x.id)===btn.dataset.viewUser);
      if (p) openAction("Taarifa za akaunti",`${userName(p)} · ${p.email||p.id}`,()=>window.ZUNE_LAYOUT?.toast("Maelezo yameonyeshwa kutoka profiles. Vitendo vya kubadilisha akaunti vitahitaji RPC salama."));
    }
  });
  window.ZUNE_ADMIN = {renderModule,refreshOverview};
  window.addEventListener("DOMContentLoaded",async()=>{
    if (window.ZUNE_AUTH_READY) await window.ZUNE_AUTH_READY;
    await refreshOverview();
    if (window.ZUNE_LAYOUT?.activeModule) {
      const m=window.ZUNE_LAYOUT.modules.find(x=>x[0]===window.ZUNE_LAYOUT.activeModule);
      if (m) renderModule(m[0],m[1],m[2]);
    }
  });
})();
