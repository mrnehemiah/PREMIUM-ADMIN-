document.addEventListener("DOMContentLoaded",()=>{
 const nav=document.getElementById("mainNav"),side=document.getElementById("sidebar"),menu=document.getElementById("menuBtn");
 if(menu)menu.addEventListener("click",()=>side.classList.toggle("open"));
 if(nav){const here=location.pathname.split("/").pop()||"index.html";nav.querySelectorAll("a").forEach(a=>{a.classList.toggle("active",a.getAttribute("href").split("/").pop()===here)})}
 const c=document.getElementById("connectionLabel");if(c&&window.zuneIsLive)c.textContent="LIVE SUPABASE";
 const n=document.getElementById("modeNotice");if(n&&window.zuneIsLive)n.classList.add("hidden");
 const refresh=document.getElementById("refreshDashboard");if(refresh)refresh.addEventListener("click",()=>{location.reload()});
 const name=localStorage.getItem("zune_admin_name")||"ZUNE Admin";["sidebarAdmin","topAdmin"].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=name});
});
window.zuneToast=(msg)=>{const host=document.getElementById("toastHost");if(!host)return;const el=document.createElement("div");el.className="toast";el.textContent=msg;host.appendChild(el);setTimeout(()=>el.remove(),3200)};
