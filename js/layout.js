/* ZUNE PREMIUM ADMIN — layout, module navigation and access guard */
(() => {
  "use strict";
  const C = window.ZUNE_CONFIG || {};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const toast = (message) => {
    const el = $("#toast"); if (!el) return;
    el.textContent = message; el.classList.add("show");
    clearTimeout(el._timer); el._timer = setTimeout(() => el.classList.remove("show"), 3000);
  };
  const modules = [
    ["overview","Dashboard Overview","Muhtasari wa shughuli za ZUNE Marketplace."],
    ["users","User Management","Simamia watumiaji, roles, hali za akaunti na taarifa zao."],
    ["sellers","Seller Management","Simamia wauzaji, maduka, status na taarifa za seller."],
    ["products","Product Management","Simamia bidhaa, bei, stock na hali ya bidhaa."],
    ["categories","Category Management","Simamia categories na mpangilio wa bidhaa."],
    ["orders","Order Management","Fuatilia oda, malipo na hatua za usafirishaji."],
    ["wallet","Wallet Management","Muhtasari wa wallet na miamala ya watumiaji."],
    ["payments","Payments & Transactions","Fuatilia malipo na transaction references."],
    ["commission","Commission Management","Kiwango cha commission cha ZUNE ni 3% ya mauzo."],
    ["delivery","Delivery & Logistics","Simamia delivery zones, gharama na logistics."],
    ["disputes","Disputes & Complaints","Kagua malalamiko na migogoro ya miamala."],
    ["reviews","Reviews & Ratings","Simamia reviews na ratings za marketplace."],
    ["promotions","Promotions & Banners","Simamia coupons, matangazo na banners."],
    ["reports","Analytics & Reports","Ripoti za biashara na mwenendo wa marketplace."],
    ["security","Security & Permissions","Usalama, ruhusa na sessions za akaunti."],
    ["audit","Admin Activity Logs","Rekodi za matendo yote ya kiutawala."],
    ["health","System Health","Hali ya huduma na vipengele vya mfumo."],
    ["database","Database Monitoring","Ufuatiliaji wa database na afya ya data."],
    ["monthly-audit","Monthly System Audit","Checklist ya ukaguzi wa mfumo kila mwezi."],
    ["settings","General Settings","Mipangilio ya jumla ya ZUNE Admin."]
  ];
  let active = "overview";
  function setModule(id) {
    const item = modules.find(m => m[0] === id); if (!item) return;
    active = id;
    $$(".module-card").forEach(card => {
      const on = card.dataset.module === id;
      card.classList.toggle("active", on);
      card.setAttribute("aria-pressed", String(on));
    });
    $("#modulePosition").textContent = `${modules.findIndex(m=>m[0]===id)+1} / ${modules.length}`;
    if (window.ZUNE_ADMIN && typeof window.ZUNE_ADMIN.renderModule === "function") {
      window.ZUNE_ADMIN.renderModule(id, item[1], item[2]);
    } else {
      $("#modulePreview").innerHTML = `<h2>${item[1]}</h2><p>${item[2]}</p>`;
    }
    if (window.innerWidth <= 600) $("#modulePreview")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("#moduleGrid")?.addEventListener("click", e => {
    const card = e.target.closest("[data-module]"); if (card) setModule(card.dataset.module);
  });
  $("#moduleSearch")?.addEventListener("input", e => {
    const term = e.target.value.trim().toLowerCase();
    $$(".module-card").forEach(card => card.hidden = !card.textContent.toLowerCase().includes(term));
  });
  window.ZUNE_LAYOUT = {modules, setModule, toast, get activeModule(){return active;}};

  async function guard() {
    if (!C.AUTH_REQUIRED) return true;
    const sb = window.zuneSupabase;
    if (!sb) { toast("Weka Supabase credentials kwenye js/config.js kwanza."); return false; }
    try {
      const {data:{session}, error} = await sb.auth.getSession();
      if (error) throw error;
      if (!session) { location.replace("login.html"); return false; }
      const {data:profile, error:profileError} = await sb.from("profiles").select("role").eq("id",session.user.id).single();
      if (profileError) throw profileError;
      if (!profile || profile.role !== (C.ADMIN_ROLE || "admin")) {
        await sb.auth.signOut(); location.replace("login.html"); return false;
      }
      window.ZUNE_ADMIN_SESSION = session;
      return true;
    } catch (err) {
      console.error("ZUNE admin access check:", err);
      toast("Imeshindikana kuthibitisha ruhusa ya Admin. Angalia profiles/RLS.");
      return false;
    }
  }
  window.ZUNE_AUTH_READY = guard();
  window.addEventListener("DOMContentLoaded", () => setModule("overview"));
})();
